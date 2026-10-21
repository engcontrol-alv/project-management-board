import { addDays, diffDays, type IsoDate } from '@/shared/lib/dates';
import type { ScheduleResult } from './cpm';

export type BaselineTasks = Record<string, { start: IsoDate; finish: IsoDate; duration: number }>;

export function milestoneForecast(
  m: { predecessorIds: readonly string[]; manualDate: IsoDate | null },
  r: ScheduleResult,
): IsoDate | null {
  if (!m.predecessorIds.length) return m.manualDate;
  if (!r.ok) return null;
  const finishes = m.predecessorIds.map((id) => r.tasks[id]?.finish).filter((d): d is IsoDate => !!d);
  if (!finishes.length) return m.manualDate;
  return finishes.reduce((a, b) => (b > a ? b : a));
}

export function milestoneIsCritical(m: { predecessorIds: readonly string[] }, r: ScheduleResult): boolean {
  return r.ok && m.predecessorIds.some((id) => r.tasks[id]?.critical === true);
}

export const MILESTONE_STATUSES = ['Concluído', 'No prazo', 'Atenção', 'Atrasado'] as const;
export type MilestoneStatus = (typeof MILESTONE_STATUSES)[number];

export function milestoneStatus(args: {
  actualDate: IsoDate | null;
  forecast: IsoDate | null;
  baselineDate: IsoDate | null;
  statusDate: IsoDate;
  toleranceDays: number;
}): MilestoneStatus {
  if (args.actualDate) return 'Concluído';
  if (!args.forecast) return 'No prazo';
  if (args.forecast < args.statusDate) return 'Atrasado';
  if (!args.baselineDate) return 'No prazo';
  const deviation = diffDays(args.baselineDate, args.forecast);
  if (deviation > args.toleranceDays) return 'Atrasado';
  if (deviation > 0) return 'Atenção';
  return 'No prazo';
}

/** % físico ponderado pela duração; pacotes de duração 0 não pesam. */
export function physicalProgress(tasks: { duration: number; percentComplete: number }[]): number | null {
  const weight = tasks.reduce((s, t) => s + t.duration, 0);
  if (!weight) return null;
  return tasks.reduce((s, t) => s + t.duration * t.percentComplete, 0) / weight;
}

function plannedFraction(t: { start: IsoDate; duration: number }, date: IsoDate): number {
  return Math.min(1, Math.max(0, (diffDays(t.start, date) + 1) / t.duration));
}

/** % físico planejado na data, linear entre início e término da LB. */
export function plannedProgress(b: BaselineTasks, statusDate: IsoDate): number | null {
  const tasks = Object.values(b).filter((t) => t.duration > 0);
  const weight = tasks.reduce((s, t) => s + t.duration, 0);
  if (!weight) return null;
  return (tasks.reduce((s, t) => s + t.duration * plannedFraction(t, statusDate), 0) / weight) * 100;
}

export function physicalSpi(actual: number | null, planned: number | null): number | null {
  if (actual === null || planned === null || planned === 0) return null;
  const spi = actual / planned;
  return Number.isFinite(spi) ? spi : null;
}

export type SCurvePoint = { date: IsoDate; planned: number; actual: number | null };

/** Curva S física semanal sobre a LB; o real é conhecido só no início (0) e na data de status. */
export function physicalSCurve(b: BaselineTasks, actualNow: number | null, statusDate: IsoDate): SCurvePoint[] {
  const tasks = Object.values(b);
  if (!tasks.length) return [];
  const first = tasks.map((t) => t.start).reduce((a, c) => (c < a ? c : a));
  const last = tasks.map((t) => t.finish).reduce((a, c) => (c > a ? c : a));
  const dates = new Set<IsoDate>();
  for (let d = first; d <= last; d = addDays(d, 7)) dates.add(d);
  dates.add(last);
  if (statusDate >= first && statusDate <= last) dates.add(statusDate);
  return [...dates].sort().map((date) => ({
    date,
    planned: plannedProgress(b, date) ?? 0,
    actual: date === statusDate ? actualNow : date === first && date < statusDate ? 0 : null,
  }));
}
