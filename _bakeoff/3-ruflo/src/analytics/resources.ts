import { weeklyLoad, type ResourceLoad } from '@/modules/resources';
import { maxDate, minDate } from '@/shared/lib/dates';
import type { ProjectSnapshot } from '@/project/snapshot';

export type DerivedResources = {
  load: ResourceLoad[];
  /** Maior demanda ÷ capacidade em qualquer semana (`null` sem alocações). */
  peakPct: number | null;
  /** Recursos com alguma semana acima da capacidade. */
  overallocated: string[];
};

export function deriveResources(s: ProjectSnapshot): DerivedResources {
  const resources = Object.values(s.resources.resources);
  const allocations = Object.values(s.resources.allocations).filter((a) => a.status !== 'Encerrada');
  if (allocations.length === 0)
    return { load: weeklyLoad(resources, [], { from: '2000-01-03', to: '2000-01-02' }), peakPct: null, overallocated: [] };
  const range = { from: minDate(...allocations.map((a) => a.start)), to: maxDate(...allocations.map((a) => a.finish)) };
  const load = weeklyLoad(resources, allocations, range);
  const ratios = load.flatMap((l) => l.weeks.filter((w) => w.demandPct > 0).map((w) => (w.demandPct * 100) / w.capacityPct));
  return {
    load,
    peakPct: ratios.length ? Math.max(...ratios) : null,
    overallocated: load.filter((l) => l.weeks.some((w) => w.overPct !== null)).map((l) => l.resourceId),
  };
}
