import type { Baseline } from './baseline';
import type { Project } from './project';
import { collectionByTable } from './registry';
import { getItems, setItems, type ProjectSnapshot } from './snapshot';

export type Changeset = {
  project?: Project;
  puts: { table: string; value: { id: string } }[];
  deletes: { table: string; id: string }[];
  appendBaseline?: Baseline;
};

function tableDef(table: string) {
  const def = collectionByTable(table);
  if (!def) throw new Error(`Tabela desconhecida: ${table}`);
  return def;
}

/** Aplica o changeset sem mutar o snapshot original. */
export function applyChangeset(s: ProjectSnapshot, cs: Changeset): ProjectSnapshot {
  let next = s;
  for (const { table, value } of cs.puts) {
    const def = tableDef(table);
    next = setItems(next, def, { ...getItems(next, def), [value.id]: value });
  }
  for (const { table, id } of cs.deletes) {
    const def = tableDef(table);
    const items = { ...getItems(next, def) };
    delete items[id];
    next = setItems(next, def, items);
  }
  if (cs.appendBaseline) next = { ...next, baselines: [...next.baselines, cs.appendBaseline] };
  if (cs.project) next = { ...next, project: cs.project };
  return next;
}
