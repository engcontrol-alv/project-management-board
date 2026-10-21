import type { CollectionDef } from '@/core/module-contract';
import { emptyStakeholdersData, type StakeholdersData } from '@/modules/stakeholders';
import { emptyScopeData, type ScopeData } from '@/modules/scope';
import { emptyScheduleData, type ScheduleData } from '@/modules/schedule';
import { emptyGovernanceData, type GovernanceData } from '@/modules/governance';
import type { Project } from './project';
import type { Baseline } from './baseline';

export type ProjectSnapshot = {
  project: Project;
  baselines: Baseline[];
  stakeholders: StakeholdersData;
  governance: GovernanceData;
  scope: ScopeData;
  schedule: ScheduleData;
};

export function emptySnapshot(project: Project): ProjectSnapshot {
  return {
    project,
    baselines: [],
    stakeholders: emptyStakeholdersData(),
    governance: emptyGovernanceData(project.id),
    scope: emptyScopeData(),
    schedule: emptyScheduleData(),
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any -- único ponto de acesso genérico às coleções */

/** Registros de uma coleção como `Record<id, E>` (coleção `one` → `{ [id]: e }`). */
export function getItems<E extends { id: string }>(s: ProjectSnapshot, def: CollectionDef<E>): Record<string, E> {
  const value = (s as any)[def.module]?.[def.name];
  if (value === undefined) return {};
  return def.cardinality === 'one' ? { [value.id]: value } : value;
}

/** Novo snapshot com a coleção substituída; não muta o original. */
export function setItems<E extends { id: string }>(
  s: ProjectSnapshot,
  def: CollectionDef<E>,
  items: Record<string, E>,
): ProjectSnapshot {
  const value = def.cardinality === 'one' ? Object.values(items)[0] : items;
  if (value === undefined) throw new Error(`Coleção ${def.table} exige um registro`);
  return { ...s, [def.module]: { ...(s as any)[def.module], [def.name]: value } } as ProjectSnapshot;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
