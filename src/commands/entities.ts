import type { ModuleId } from '@/core/module-contract';
import { err, ok } from '@/core/result';
import { formatCode, nextWbsCode } from '@/shared/lib/codes';
import { whereUsed } from '@/project/integrity';
import { getCollection } from '@/project/registry';
import { getItems } from '@/project/snapshot';
import { guard } from './guard';
import type { Command } from './run';

type Draft = { id: string } & Record<string, unknown>;

/** Cria ou atualiza um registro. Registro novo recebe código sequencial que nunca é reutilizado. */
export const upsertEntity = (module: ModuleId, collection: string, value: Draft): Command =>
  guard((s, ctx) => {
    const def = getCollection(module, collection);
    if (!def) return err([`Cadastro desconhecido: ${module}.${collection}`]);
    const v: Draft = { ...value, id: value.id || ctx.newId() };
    let project = { ...s.project, updatedAt: ctx.now };
    const isNew = !(v.id in getItems(s, def));

    if (isNew && !v.code && def.codePrefix) {
      const n = (project.counters[def.codePrefix] ?? 0) + 1;
      v.code = formatCode(def.codePrefix, n);
      project = { ...project, counters: { ...project.counters, [def.codePrefix]: n } };
    }
    if (isNew && !v.code && def.table === 'scope_wbs') {
      const parentId = (v.parentId as string | null) ?? null;
      const siblings = Object.values(s.scope.wbs).filter((n) => n.parentId === parentId);
      const parentCode = parentId ? (s.scope.wbs[parentId as keyof typeof s.scope.wbs]?.code ?? null) : null;
      v.code = nextWbsCode(siblings.map((n) => n.code), parentCode);
    }
    if (def.table === 'governance_meetings' && v.status === 'Realizada' && typeof v.date === 'string' && v.date > ctx.today)
      return err(['Reunião realizada não pode ter data futura.']);

    return ok({ project, puts: [{ table: def.table, value: v }], deletes: [] });
  });

export const removeEntity = (module: ModuleId, collection: string, id: string): Command =>
  guard((s, ctx) => {
    const def = getCollection(module, collection);
    if (!def) return err([`Cadastro desconhecido: ${module}.${collection}`]);
    if (def.cardinality === 'one') return err([`${def.label} não pode ser excluído.`]);
    const used = whereUsed(s, id);
    if (used.length > 0)
      return err([`Não é possível excluir: usado em ${used.map((u) => u.label).join(', ')}`]);
    return ok({
      project: { ...s.project, updatedAt: ctx.now },
      puts: [],
      deletes: [{ table: def.table, id }],
    });
  });
