import { readPath, type CollectionDef, type ModuleId } from '@/core/module-contract';
import { findCycle } from '@/modules/scope';
import { ALL_COLLECTIONS, constraintOf, getCollection } from './registry';
import { getItems, type ProjectSnapshot } from './snapshot';

export type EntityRef = { module: ModuleId; collection: string; id: string; label: string };

function refValues(entity: unknown, field: string): string[] {
  const v = readPath(entity, field);
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x !== '');
  return typeof v === 'string' && v !== '' ? [v] : [];
}

function entries(s: ProjectSnapshot): { def: CollectionDef; item: { id: string } }[] {
  return ALL_COLLECTIONS.flatMap((def) => Object.values(getItems(s, def)).map((item) => ({ def, item })));
}

/** Registros que apontam para `targetId` (bloqueia exclusão). */
export function whereUsed(s: ProjectSnapshot, targetId: string): EntityRef[] {
  const out: EntityRef[] = [];
  for (const { def, item } of entries(s)) {
    if (item.id === targetId) continue;
    if (def.refs.some((ref) => refValues(item, ref.field).includes(targetId))) {
      out.push({ module: def.module, collection: def.name, id: item.id, label: def.describe(item) });
    }
  }
  return out;
}

/** Erros de integridade referencial do snapshot, em pt-BR. */
export function findIntegrityErrors(s: ProjectSnapshot): string[] {
  const errors: string[] = [];
  const allIds = new Set(entries(s).map((e) => e.item.id));
  for (const { def, item } of entries(s)) {
    for (const ref of def.refs) {
      const prefix = `${def.describe(item)}: ${ref.label}`;
      const values = refValues(item, ref.field);
      if (ref.required && !values.length) errors.push(`${prefix} é obrigatório`);
      const targetDef = getCollection(ref.target.module, ref.target.collection);
      const targets = targetDef ? getItems(s, targetDef) : {};
      for (const id of values) {
        const target = targets[id];
        if (!target) {
          errors.push(`${prefix} aponta para um registro ${allIds.has(id) ? 'de outro tipo' : 'inexistente'}`);
          continue;
        }
        const problem = ref.constraint ? constraintOf(ref.target.module, ref.constraint)?.(target) : null;
        if (problem) errors.push(`${prefix} ${problem}`);
      }
    }
  }
  const cycle = findCycle(s.scope.wbs);
  if (cycle) {
    const codes = cycle.map((id) => s.scope.wbs[id]?.code ?? id);
    errors.push(`EAP: dependência circular entre ${codes.join(' → ')}`);
  }
  return errors;
}
