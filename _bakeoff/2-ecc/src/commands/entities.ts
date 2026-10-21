import { err, ok } from '@/core/result';
import { formatCode, nextWbsCode } from '@/shared/lib/codes';
import type { WbsNode } from '@/modules/scope';
import { whereUsed } from '@/project/integrity';
import { getCollection } from '@/project/registry';
import { getItems, type ProjectSnapshot } from '@/project/snapshot';
import type { Changeset } from '@/project/changeset';
import { guard } from './guard';
import type { Command, CommandContext } from './run';

type EntityInput = { id: string } & Record<string, unknown>;

function wbsCode(s: ProjectSnapshot, parentId: unknown): string {
  const parent = typeof parentId === 'string' ? s.scope.wbs[parentId as WbsNode['id']] : undefined;
  const siblings = Object.values(s.scope.wbs)
    .filter((n) => (n.parentId ?? null) === (parent?.id ?? null))
    .map((n) => n.code);
  return nextWbsCode(siblings, parent?.code ?? null);
}

function domainRules(collectionTable: string, value: Record<string, unknown>, ctx: CommandContext): string[] {
  if (collectionTable === 'governance_meetings' && value.status === 'Realizada' && typeof value.date === 'string') {
    if (value.date > ctx.today) return ['Reunião realizada não pode ter data futura.'];
  }
  return [];
}

/** Cria ou atualiza um registro; novos recebem ID e código (contador nunca decresce). */
export const upsertEntity = (module: string, collection: string, input: EntityInput): Command =>
  guard((s, ctx) => {
    const def = getCollection(module, collection);
    if (!def) return err([`Coleção desconhecida: ${module}.${collection}`]);
    const value: Record<string, unknown> = { ...input };
    const isNew = !value.id || !(String(value.id) in getItems(s, def));
    let project = { ...s.project, updatedAt: ctx.now };
    if (isNew) {
      if (!value.id) value.id = ctx.newId();
      if (!value.code && def.codePrefix) {
        const n = (project.counters[def.codePrefix] ?? 0) + 1;
        project = { ...project, counters: { ...project.counters, [def.codePrefix]: n } };
        value.code = formatCode(def.codePrefix, n);
      } else if (!value.code && def.table === 'scope_wbs') {
        value.code = wbsCode(s, value.parentId);
      }
    }
    const problems = domainRules(def.table, value, ctx);
    if (problems.length) return err(problems);
    const cs: Changeset = { project, puts: [{ table: def.table, value: value as { id: string } }], deletes: [] };
    return ok(cs);
  });

/** Exclui um registro não referenciado. */
export const removeEntity = (module: string, collection: string, id: string): Command =>
  guard((s, ctx) => {
    const def = getCollection(module, collection);
    if (!def) return err([`Coleção desconhecida: ${module}.${collection}`]);
    if (def.cardinality === 'one') return err(['Este registro não pode ser excluído.']);
    const used = whereUsed(s, id);
    if (used.length) return err([`Não é possível excluir: usado em ${used.map((u) => u.label).join(', ')}`]);
    return ok({ project: { ...s.project, updatedAt: ctx.now }, puts: [], deletes: [{ table: def.table, id }] });
  });
