import { addDays, diffDays, maxDate, minDate, type IsoDate } from '@/shared/lib/dates';
import type { ScheduleResult } from './cpm';

export type BaselineTasks = Record<string, { start: IsoDate; finish: IsoDate; duration: number }>;

type MilestoneLike = { predecessorIds: readonly string[]; manualDate: IsoDate | null };

/** Maior término dos predecessores; sem predecessores, a data manual. */
export function milestoneForecast(m: MilestoneLike, r: ScheduleResult): IsoDate | null {
  if (m.predecessorIds.length === 0) return m.manualDate;
  if (!r.ok) return null;
  const finishes = m.predecessorIds
    .map((id) => r.tasks[id]?.finish)
    .filter((d): d is IsoDate => d !== undefined);
  return finishes.length ? maxDate(...finishes) : null;
}

export function milestoneIsCritical(m: MilestoneLike, r: ScheduleResult): boolean {
  return r.ok && m.predecessorIds.some((id) => r.tasks[id]?.critical === true);
}

export type MilestoneStatus = 'Concluído' | 'No prazo' | 'Atenção' | 'Atrasado';

export function milestoneStatus(a: {
  actualDate: IsoDate | null;
  forecast: IsoDate | null;
  baselineDate: IsoDate | null;
  statusDate: IsoDate;
  toleranceDays: number;
}): MilestoneStatus {
  if (a.actualDate) return 'Concluído';
  if (!a.forecast) return 'No prazo';
  if (a.forecast < a.statusDate) return 'Atrasado';
  if (a.baselineDate) {
    const deviation = diffDays(a.baselineDate, a.forecast);
    if (deviation > a.toleranceDays) return 'Atrasado';
    if (deviation > 0) return 'Atenção';
  }
  return 'No prazo';
}

/** Média do % dos pacotes ponderada pela duração (duração 0 não pesa). */
export function physicalProgress(tasks: { duration: number; percentComplete: number }[]): number | null {
  const weight = tasks.reduce((s, t) => s + t.duration, 0);
  if (weight === 0) return null;
  return tasks.reduce((s, t) => s + t.duration * t.percentComplete, 0) / weight;
}

/** % físico planejado na data, linear entre início e término da linha de base. */
export function plannedProgress(b: BaselineTasks, statusDate: IsoDate): number | null {
  const tasks = Object.values(b).filter((t) => t.duration > 0);
  const weight = tasks.reduce((s, t) => s + t.duration, 0);
  if (weight === 0) return null;
  const done = tasks.reduce((s, t) => {
    const fraction = Math.min(1, Math.max(0, (diffDays(t.start, statusDate) + 1) / t.duration));
    return s + t.duration * fraction;
  }, 0);
  return (done / weight) * 100;
}

export function physicalSpi(actual: number | null, planned: number | null): number | null {
  if (actual === null || planned === null || planned === 0) return null;
  return actual / planned;
}

export type SCurvePoint = { date: IsoDate; planned: number; actual: number | null };

/**
 * Curva S física: pontos semanais desde o início da LB até o término, mais a data de status.
 * O realizado é conhecido apenas até a data de status (interpolado a partir de 0 no início).
 */
export function physicalSCurve(
  b: BaselineTasks,
  actualNow: number | null,
  statusDate: IsoDate,
): SCurvePoint[] {
  const tasks = Object.values(b).filter((t) => t.duration > 0);
  if (tasks.length === 0) return [];
  const start = minDate(...tasks.map((t) => t.start));
  const end = maxDate(...tasks.map((t) => t.finish));
  const dates = new Set<IsoDate>();
  for (let d = start; d < end; d = addDays(d, 7)) dates.add(d);
  dates.add(end);
  if (statusDate >= start) dates.add(statusDate);
  const span = diffDays(start, statusDate);
  return [...dates].sort().map((date) => {
    let actual: number | null = null;
    if (actualNow !== null && date <= statusDate) {
      actual = span === 0 ? actualNow : (actualNow * diffDays(start, date)) / span;
    }
    return { date, planned: plannedProgress(b, date) ?? 0, actual };
  });
}
