import type { CollectionDef, Entity } from '@/core/module-contract';
import { emptyFinancesData, type FinancesData } from '@/modules/finances';
import { emptyGovernanceData, type GovernanceData } from '@/modules/governance';
import { emptyResourcesData, type ResourcesData } from '@/modules/resources';
import { emptyRisksData, type RisksData } from '@/modules/risks';
import { emptyScopeData, type ScopeData } from '@/modules/scope';
import { emptyScheduleData, type ScheduleData } from '@/modules/schedule';
import { emptyStakeholdersData, type StakeholdersData } from '@/modules/stakeholders';
import type { Baseline } from './baseline';
import type { Project } from './project';

export type ProjectSnapshot = {
  project: Project;
  /** Ordenadas por versão. */
  baselines: Baseline[];
  stakeholders: StakeholdersData;
  governance: GovernanceData;
  scope: ScopeData;
  schedule: ScheduleData;
  finances: FinancesData;
  risks: RisksData;
  resources: ResourcesData;
};

export function emptySnapshot(project: Project): ProjectSnapshot {
  return {
    project,
    baselines: [],
    stakeholders: emptyStakeholdersData(),
    governance: emptyGovernanceData(project.id),
    scope: emptyScopeData(),
    schedule: emptyScheduleData(),
    finances: emptyFinancesData(),
    risks: emptyRisksData(),
    resources: emptyResourcesData(),
  };
}

/* Único ponto de acesso genérico às coleções do snapshot (cast controlado). */
/* eslint-disable @typescript-eslint/no-explicit-any */

export function getItems<E extends Entity = Entity>(
  s: ProjectSnapshot,
  def: CollectionDef<any>,
): Record<string, E> {
  const slice = (s as any)[def.module];
  if (!slice) return {};
  const value = slice[def.name];
  if (def.cardinality === 'one') return value ? { [value.id]: value } : {};
  return (value ?? {}) as Record<string, E>;
}

export function setItems(
  s: ProjectSnapshot,
  def: CollectionDef<any>,
  items: Record<string, Entity>,
): ProjectSnapshot {
  const slice = (s as any)[def.module] ?? {};
  let value: any = items;
  if (def.cardinality === 'one') {
    const [first] = Object.values(items);
    if (!first) throw new Error(`${def.label}: registro único não pode ser removido`);
    value = first;
  }
  return { ...s, [def.module]: { ...slice, [def.name]: value } } as ProjectSnapshot;
}
