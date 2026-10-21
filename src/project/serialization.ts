import { err, ok, type Result } from '@/core/result';
import type { IsoDate } from '@/shared/lib/dates';
import { issuesToMessages, ptErrorMap } from '@/shared/lib/zod';
import { baselineSchema, type Baseline } from './baseline';
import { findIntegrityErrors } from './integrity';
import { migrateExport, SCHEMA_VERSION, UnsupportedVersionError } from './migrations';
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
  /** SHA-256 (hex) do JSON canônico do arquivo sem este campo (D9). Ausente em arquivos antigos. */
  checksumSha256?: string;
};

export type ParseError = { code: 'format' | 'version' | 'invalid'; message: string };
export type ImportError = { code: 'json' | 'checksum' | ParseError['code']; message: string };

const MAX_LISTED = 10;

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

/** JSON com chaves ordenadas em todos os níveis: o hash não depende da ordem nem da indentação. */
export function canonicalJson(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map((x) => (x === undefined ? 'null' : canonicalJson(x))).join(',')}]`;
  if (v && typeof v === 'object')
    return `{${Object.keys(v)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${canonicalJson((v as Record<string, unknown>)[k])}`)
      .join(',')}}`;
  return JSON.stringify(v);
}

/** SHA-256 em hexadecimal minúsculo via Web Crypto (`crypto.subtle.digest`). */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Web Crypto só existe em contexto seguro (https, localhost, arquivo local). */
const canHash = () => typeof crypto !== 'undefined' && !!crypto.subtle;

const payloadOf = (file: Record<string, unknown>) => {
  const { checksumSha256: _omit, ...payload } = file;
  return payload;
};

/** Acrescenta `checksumSha256`; sem Web Crypto, exporta sem o campo (o arquivo continua válido). */
export async function withChecksum(file: ExportFile): Promise<ExportFile> {
  if (!canHash()) return file;
  return { ...file, checksumSha256: await sha256Hex(canonicalJson(payloadOf(file))) };
}

export type ChecksumStatus = 'ok' | 'ausente' | 'divergente' | 'indisponível';

export async function verifyChecksum(raw: unknown): Promise<ChecksumStatus> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'ausente';
  const expected = (raw as { checksumSha256?: unknown }).checksumSha256;
  if (expected === undefined) return 'ausente';
  if (!canHash()) return 'indisponível';
  const actual = await sha256Hex(canonicalJson(payloadOf(raw as Record<string, unknown>)));
  return typeof expected === 'string' && expected.toLowerCase() === actual ? 'ok' : 'divergente';
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

function invalid(errors: string[]): ParseError {
  const listed = errors.slice(0, MAX_LISTED).map((e) => `- ${e}`);
  if (errors.length > MAX_LISTED) listed.push(`- … e mais ${errors.length - MAX_LISTED} problema(s)`);
  return { code: 'invalid', message: ['O arquivo contém dados inválidos:', ...listed].join('\n') };
}

/** Formato → versão → migração → schema por tabela → integridade. Puro; usado na importação e na carga. */
export function parseExport(raw: unknown): Result<ProjectSnapshot, ParseError> {
  if (!raw || typeof raw !== 'object' || (raw as { format?: unknown }).format !== 'pmb-export')
    return err({ code: 'format', message: 'O arquivo não é uma exportação do Project Management Board.' });

  let migrated: unknown;
  try {
    migrated = migrateExport(raw);
  } catch (e) {
    if (e instanceof UnsupportedVersionError) return err({ code: 'version', message: e.message });
    throw e;
  }
  const file = migrated as Partial<Record<keyof ExportFile, unknown>>;
  const errors: string[] = [];

  const project = projectSchema.safeParse(file.project, { errorMap: ptErrorMap });
  if (!project.success) {
    errors.push(...issuesToMessages(project.error).map((m) => `projeto: ${m}`));
    return err(invalid(errors));
  }

  const baselines: Baseline[] = [];
  if (!Array.isArray(file.baselines)) errors.push('linhas de base: formato inválido');
  else
    file.baselines.forEach((b, i) => {
      const parsed = baselineSchema.safeParse(b, { errorMap: ptErrorMap });
      if (parsed.success) baselines.push(parsed.data);
      else errors.push(...issuesToMessages(parsed.error).map((m) => `linha de base ${i + 1}: ${m}`));
    });

  let snapshot = emptySnapshot(project.data);
  const data = file.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) errors.push('dados: formato inválido');
  else {
    for (const [table, rows] of Object.entries(data)) {
      const def = collectionByTable(table);
      if (!def) {
        errors.push(`tabela desconhecida: ${table}`);
        continue;
      }
      if (!Array.isArray(rows)) {
        errors.push(`${def.label}: formato inválido`);
        continue;
      }
      if (def.cardinality === 'one' && rows.length > 1) errors.push(`${def.label}: mais de um registro`);
      const items: Record<string, { id: string }> = {};
      rows.forEach((row, i) => {
        const parsed = def.schema.safeParse(row, { errorMap: ptErrorMap });
        if (!parsed.success) {
          errors.push(...issuesToMessages(parsed.error).map((m) => `${def.label} #${i + 1}: ${m}`));
          return;
        }
        if (items[parsed.data.id]) errors.push(`${def.label}: id duplicado ${parsed.data.id}`);
        items[parsed.data.id] = parsed.data;
      });
      // Registro único ausente mantém o valor inicial do snapshot vazio.
      if (def.cardinality === 'many' || Object.keys(items).length > 0)
        snapshot = setItems(snapshot, def, items);
    }
  }
  if (errors.length > 0) return err(invalid(errors));

  snapshot = { ...snapshot, baselines: [...baselines].sort((a, b) => a.version - b.version) };
  const integrity = findIntegrityErrors(snapshot);
  if (integrity.length > 0) return err(invalid(integrity));
  return ok(snapshot);
}

export type ImportSummary = { name: string; code: string; counts: Record<string, number> };

export function summarize(s: ProjectSnapshot): ImportSummary {
  const counts: Record<string, number> = {};
  for (const def of ALL_COLLECTIONS)
    if (def.cardinality === 'many') counts[def.label] = Object.keys(getItems(s, def)).length;
  counts['Linhas de base'] = s.baselines.length;
  return { name: s.project.info.name, code: s.project.info.code, counts };
}

export type Integrity = 'verificada' | 'ausente' | 'não verificável';

const INTEGRITY: Record<Exclude<ChecksumStatus, 'divergente'>, Integrity> = {
  ok: 'verificada',
  ausente: 'ausente',
  indisponível: 'não verificável',
};

/** Importação de arquivo: valida o checksum (se houver) antes de qualquer outra etapa; nada é gravado aqui. */
export async function parseImportFile(
  text: string,
): Promise<Result<{ snapshot: ProjectSnapshot; summary: ImportSummary; integrity: Integrity }, ImportError>> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err({ code: 'json', message: 'O arquivo não é um JSON válido.' });
  }
  const status = await verifyChecksum(raw);
  if (status === 'divergente')
    return err({
      code: 'checksum',
      message: 'Integridade SHA-256 não confere: o arquivo foi alterado ou corrompido depois da exportação.',
    });
  const parsed = parseImportText(text);
  if (!parsed.ok) return parsed;
  return ok({ ...parsed.value, integrity: INTEGRITY[status] });
}

export function parseImportText(
  text: string,
): Result<{ snapshot: ProjectSnapshot; summary: ImportSummary }, ImportError> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return err({ code: 'json', message: 'O arquivo não é um JSON válido.' });
  }
  const parsed = parseExport(raw);
  if (!parsed.ok) return parsed;
  return ok({ snapshot: parsed.value, summary: summarize(parsed.value) });
}
