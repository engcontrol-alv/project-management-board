import { readPath, type ModuleId } from '@/core/module-contract';
import { findCycle } from '@/modules/scope';
import { ALL_COLLECTIONS, getCollection, manifestOf } from './registry';
import { getItems, type ProjectSnapshot } from './snapshot';

export type EntityRef = { module: ModuleId; collection: string; id: string; label: string };

function refValues(entity: unknown, field: string, many: boolean): string[] {
  const v = readPath(entity, field);
  if (many) return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  return typeof v === 'string' ? [v] : [];
}

/** Registros que apontam para `targetId` (bloqueia exclusão; inclui pai e predecessores da EAP). */
export function whereUsed(s: ProjectSnapshot, targetId: string): EntityRef[] {
  const out: EntityRef[] = [];
  for (const def of ALL_COLLECTIONS) {
    for (const e of Object.values(getItems(s, def))) {
      if (e.id === targetId) continue;
      if (def.refs.some((r) => refValues(e, r.field, r.many).includes(targetId)))
        out.push({ module: def.module, collection: def.name, id: e.id, label: def.describe(e) });
    }
  }
  return out;
}

/** Alvo inexistente, coleção errada, restrição violada e ciclo na EAP — mensagens em pt-BR. */
export function findIntegrityErrors(s: ProjectSnapshot): string[] {
  const errors: string[] = [];
  const allIds = new Map<string, string>();
  for (const def of ALL_COLLECTIONS)
    for (const id of Object.keys(getItems(s, def))) allIds.set(id, def.table);

  for (const def of ALL_COLLECTIONS) {
    for (const e of Object.values(getItems(s, def))) {
      const who = def.describe(e);
      for (const ref of def.refs) {
        const values = refValues(e, ref.field, ref.many);
        if (ref.required && values.length === 0) {
          errors.push(`${who}: ${ref.label} é obrigatório`);
          continue;
        }
        const targetDef = getCollection(ref.target.module, ref.target.collection);
        if (!targetDef) continue; // módulo-alvo ainda não implementado
        const targets = getItems(s, targetDef);
        for (const id of values) {
          const target = targets[id];
          if (!target) {
            errors.push(
              allIds.has(id)
                ? `${who}: ${ref.label} aponta para um registro de outro cadastro`
                : `${who}: ${ref.label} aponta para um registro inexistente`,
            );
            continue;
          }
          if (!ref.constraint) continue;
          const check = manifestOf(ref.target.module)?.constraints[ref.constraint];
          const problem = check ? check(target) : `restrição desconhecida ${ref.constraint}`;
          if (problem) errors.push(`${who}: ${ref.label} ${problem}`);
        }
      }
    }
  }

  const cycle = findCycle(s.scope.wbs);
  if (cycle) {
    const codes = [...cycle, cycle[0]!].map((id) => s.scope.wbs[id]?.code ?? id);
    errors.push(`A EAP tem dependência circular: ${codes.join(' → ')}`);
  }
  return errors;
}
