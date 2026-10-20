import { addDays, diffDays, startOfWeek, type IsoDate } from '@/shared/lib/dates';
import { roundHalfEven } from '@/shared/lib/money';

type LoadResource = { id: string; capacityPct: number };
type LoadAllocation = { resourceId: string | null; pct: number; start: IsoDate; finish: IsoDate; status: string };

export type WeekLoad = { week: IsoDate; demandPct: number; capacityPct: number; overPct: number | null };
export type ResourceLoad = { resourceId: string; weeks: WeekLoad[] };

/**
 * Capacidade × demanda por semana (segunda a domingo): soma o % das alocações
 * Planejada/Ativa que cruzam a semana (SPEC §6.6). `overPct` só quando passa da capacidade.
 */
export function weeklyLoad(
  resources: LoadResource[],
  allocations: LoadAllocation[],
  range: { from: IsoDate; to: IsoDate },
): ResourceLoad[] {
  const weeks: IsoDate[] = [];
  for (let w = startOfWeek(range.from); w <= range.to; w = addDays(w, 7)) weeks.push(w);
  const active = allocations.filter((a) => a.status !== 'Encerrada');
  return resources.map((r) => ({
    resourceId: r.id,
    weeks: weeks.map((week) => {
      const end = addDays(week, 6);
      const demandPct = active
        .filter((a) => a.resourceId === r.id && a.start <= end && a.finish >= week)
        .reduce((s, a) => s + a.pct, 0);
      const over = demandPct > r.capacityPct ? (demandPct * 100) / r.capacityPct : null;
      return { week, demandPct, capacityPct: r.capacityPct, overPct: over };
    }),
  }));
}

/** Maior `overPct` entre todos os recursos e semanas (`null` = ninguém sobrealocado). */
export function peakOverallocation(load: ResourceLoad[]): number | null {
  const values = load.flatMap((l) => l.weeks.map((w) => w.overPct)).filter((v): v is number => v !== null);
  return values.length ? Math.max(...values) : null;
}

/** Custo estimado (informativo): taxa homem-hora × horas/dia × dias × %. */
export function estimatedCost(
  a: { pct: number; start: IsoDate; finish: IsoDate },
  r: { hourlyRateCents: number | null },
  hoursPerDay: number,
): number | null {
  if (r.hourlyRateCents === null) return null;
  const days = diffDays(a.start, a.finish) + 1;
  return roundHalfEven((r.hourlyRateCents * hoursPerDay * days * a.pct) / 100);
}
