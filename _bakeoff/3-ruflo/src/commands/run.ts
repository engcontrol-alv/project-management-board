import { err, ok, type Result } from '@/core/result';
import type { IsoDate } from '@/shared/lib/dates';
import { issuesToMessages, ptErrorMap } from '@/shared/lib/zod';
import { baselineSchema } from '@/project/baseline';
import { applyChangeset, type Changeset } from '@/project/changeset';
import { findIntegrityErrors } from '@/project/integrity';
import { projectSchema } from '@/project/project';
import { collectionByTable } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';

export type CommandContext = { now: string; today: IsoDate; newId: () => string };
export type Command = (s: ProjectSnapshot, ctx: CommandContext) => Result<Changeset, string[]>;

/** Comando → Changeset → aplica → valida schemas e integridade. Puro. */
export function runCommand(
  s: ProjectSnapshot,
  cmd: Command,
  ctx: CommandContext,
): Result<{ snapshot: ProjectSnapshot; changeset: Changeset }, string[]> {
  const produced = cmd(s, ctx);
  if (!produced.ok) return produced;
  const cs = produced.value;
  const errors: string[] = [];

  for (const { table, value } of cs.puts) {
    const def = collectionByTable(table);
    if (!def) {
      errors.push(`Tabela desconhecida: ${table}`);
      continue;
    }
    const parsed = def.schema.safeParse(value, { errorMap: ptErrorMap });
    if (!parsed.success) errors.push(...issuesToMessages(parsed.error));
  }
  if (cs.appendBaseline) {
    const parsed = baselineSchema.safeParse(cs.appendBaseline, { errorMap: ptErrorMap });
    if (!parsed.success) errors.push(...issuesToMessages(parsed.error).map((m) => `linha de base: ${m}`));
  }
  if (cs.project) {
    const parsed = projectSchema.safeParse(cs.project, { errorMap: ptErrorMap });
    if (!parsed.success) errors.push(...issuesToMessages(parsed.error));
  }
  if (errors.length > 0) return err(errors);

  const next = applyChangeset(s, cs);
  const integrity = findIntegrityErrors(next);
  if (integrity.length > 0) return err(integrity);
  return ok({ snapshot: next, changeset: cs });
}
