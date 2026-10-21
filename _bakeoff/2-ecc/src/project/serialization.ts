import { z } from 'zod';
import { err, ok, type Result } from '@/core/result';
import type { IsoDate } from '@/shared/lib/dates';
import { zodMessages } from '@/shared/lib/zod';
import { baselineSchema, type Baseline } from './baseline';
import { findIntegrityErrors } from './integrity';
import { SCHEMA_VERSION, UnsupportedVersionError, migrateExport } from './migrations';
import { projectSchema, type Project } from './project';
import { ALL_COLLECTIONS, collectionByTable } from './registry';
import { emptySnapshot, getItems, setItems, type ProjectSnapshot } from './snapshot';

export type ExportFile = {
  format: 'pmb-export';
  schemaVersion: number;
  exportedAt: string;
  project: Project;
  baselines: Baseline[];
  data: Record<string, unknown[]>;
};

export type ParseErrorCode = 'json' | 'format' | 'version' | 'invalid';
export type ParseError = { code: ParseErrorCode; message: string };
export type ImportSummary = { name: string; code: string; counts: Record<string, number> };

const MAX_LISTED = 10;
const MSG = {
  json: 'O arquivo não é um JSON válido.',
  format: 'O arquivo não é uma exportação do Project Management Board.',
  invalid: 'O arquivo contém dados inválidos:',
};

export function toExport(s: ProjectSnapshot, now: string): ExportFile {
  return {
    format: 'pmb-export',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: now,
    project: s.project,
    baselines: s.baselines,
    data: Object.fromEntries(ALL_COLLECTIONS.map((def) => [def.table, Object.values(getItems(s, def))])),
  };
}

export function exportFileName(s: ProjectSnapshot, today: IsoDate): string {
  const slug = s.project.info.code
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `pmb-${slug || 'projeto'}-${today}.json`;
}

function invalid(problems: string[]): { ok: false; error: ParseError } {
  const listed = problems.slice(0, MAX_LISTED).map((p) => `- ${p}`);
  const more = problems.length > MAX_LISTED ? [`… e mais ${problems.length - MAX_LISTED} problema(s).`] : [];
  return err({ code: 'invalid', message: [MSG.invalid, ...listed, ...more].join('\n') });
}

const envelopeSchema = z.object({
  format: z.literal('pmb-export'),
  schemaVersion: z.number().int(),
});

const bodySchema = z.object({
  exportedAt: z.string().optional(),
  project: projectSchema,
  baselines: z.array(baselineSchema),
  data: z.record(z.array(z.unknown())),
});

/** Valida um export (ou o dump do IndexedDB) e monta o snapshot. Puro. */
export function parseExport(raw: unknown): Result<ProjectSnapshot, ParseError> {
  if (!envelopeSchema.safeParse(raw).success) return err({ code: 'format', message: MSG.format });
  let migrated: unknown;
  try {
    migrated = migrateExport(raw);
  } catch (e) {
    if (e instanceof UnsupportedVersionError) return err({ code: 'version', message: e.message });
    throw e;
  }
  const body = bodySchema.safeParse(migrated);
  if (!body.success) return invalid(zodMessages(body.error));

  const problems: string[] = [];
  let snapshot = emptySnapshot(body.data.project);
  snapshot = { ...snapshot, baselines: [...body.data.baselines].sort((a, b) => a.version - b.version) };
  for (const table of Object.keys(body.data.data)) {
    if (!collectionByTable(table)) problems.push(`tabela desconhecida: ${table}`);
  }
  for (const def of ALL_COLLECTIONS) {
    const rows = body.data.data[def.table] ?? [];
    const items: Record<string, { id: string }> = {};
    rows.forEach((row, i) => {
      const parsed = def.schema.safeParse(row);
      if (parsed.success) items[parsed.data.id] = parsed.data;
      else problems.push(...zodMessages(parsed.error, `${def.label} #${i + 1}: `));
    });
    if (def.cardinality === 'one') {
      if (rows.length !== 1) {
        problems.push(`${def.label}: deve existir exatamente um registro`);
        continue;
      }
      if (!Object.keys(items).length) continue;
    }
    snapshot = setItems(snapshot, def, items);
  }
  if (problems.length) return invalid(problems);
  const integrity = findIntegrityErrors(snapshot);
  if (integrity.length) return invalid(integrity);
  return ok(snapshot);
}

export function summarize(s: ProjectSnapshot): ImportSummary {
  return {
    name: s.project.info.name,
    code: s.project.info.code,
    counts: Object.fromEntries(
      ALL_COLLECTIONS.filter((d) => d.cardinality === 'many').map((d) => [d.label, Object.keys(getItems(s, d)).length]),
    ),
  };
}

export function parseImportText(
  text: string,
): Result<{ snapshot: ProjectSnapshot; summary: ImportSummary }, ParseError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err({ code: 'json', message: MSG.json });
  }
  const parsed = parseExport(raw);
  if (!parsed.ok) return parsed;
  return ok({ snapshot: parsed.value, summary: summarize(parsed.value) });
}
