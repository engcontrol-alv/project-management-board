import { err, ok, type Result } from '@/core/result';
import type { IsoDate } from '@/shared/lib/dates';
import { zodMessages } from '@/shared/lib/zod';
import { baselineSchema } from '@/project/baseline';
import { applyChangeset, type Changeset } from '@/project/changeset';
import { findIntegrityErrors } from '@/project/integrity';
import { projectSchema } from '@/project/project';
import { collectionByTable } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';

export type CommandContext = { now: string; today: IsoDate; newId: () => string };
export type Command = (s: ProjectSnapshot, ctx: CommandContext) => Result<Changeset, string[]>;

/** Executa o comando de forma pura: changeset → aplicação → schema de cada gravação → integridade. */
export function runCommand(
  s: ProjectSnapshot,
  cmd: Command,
  ctx: CommandContext,
): Result<{ snapshot: ProjectSnapshot; changeset: Changeset }, string[]> {
  const result = cmd(s, ctx);
  if (!result.ok) return result;
  const changeset = result.value;
  const errors: string[] = [];
  for (const { table, value } of changeset.puts) {
    const def = collectionByTable(table);
    if (!def) {
      errors.push(`Tabela desconhecida: ${table}`);
      continue;
    }
    const parsed = def.schema.safeParse(value);
    if (!parsed.success) errors.push(...zodMessages(parsed.error));
  }
  if (changeset.project) {
    const parsed = projectSchema.safeParse(changeset.project);
    if (!parsed.success) errors.push(...zodMessages(parsed.error));
  }
  if (changeset.appendBaseline) {
    const parsed = baselineSchema.safeParse(changeset.appendBaseline);
    if (!parsed.success) errors.push(...zodMessages(parsed.error, 'Linha de base: '));
  }
  if (errors.length) return err(errors);
  const snapshot = applyChangeset(s, changeset);
  const integrity = findIntegrityErrors(snapshot);
  if (integrity.length) return err(integrity);
  return ok({ snapshot, changeset });
}
