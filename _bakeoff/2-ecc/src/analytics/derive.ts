import { diffDays, type IsoDate } from '@/shared/lib/dates';
import type { WbsNode } from '@/modules/scope';
import {
  computeSchedule,
  milestoneForecast,
  milestoneIsCritical,
  milestoneStatus,
  physicalProgress,
  physicalSCurve,
  physicalSpi,
  plannedProgress,
  rollupGroups,
  type GroupRollup,
  type MilestoneStatus,
  type SCurvePoint,
  type ScheduleResult,
} from '@/modules/schedule';
import type { Baseline } from '@/project/baseline';
import { resolveConfig } from '@/project/config';
import type { Project } from '@/project/project';
import type { ProjectSnapshot } from '@/project/snapshot';

export function effectiveStatusDate(p: Project, today: IsoDate): IsoDate {
  return p.statusDate ?? today;
}

export function currentBaseline(s: ProjectSnapshot): Baseline | null {
  return s.baselines.reduce<Baseline | null>((cur, b) => (!cur || b.version > cur.version ? b : cur), null);
}

export type DerivedMilestone = {
  forecast: IsoDate | null;
  baselineDate: IsoDate | null;
  deviationDays: number | null;
  status: MilestoneStatus;
  critical: boolean;
};

export type DerivedProject = {
  statusDate: IsoDate;
  schedule: ScheduleResult;
  groups: Record<string, GroupRollup>;
  milestones: Record<string, DerivedMilestone>;
  progress: { actual: number | null; planned: number | null; spi: number | null };
  sCurve: SCurvePoint[];
};

export function workPackages(s: ProjectSnapshot): WbsNode[] {
  return Object.values(s.scope.wbs).filter((n) => n.kind === 'Pacote de trabalho');
}

/** Projeção pura do snapshot na data de status. */
export function deriveProject(s: ProjectSnapshot, statusDate: IsoDate): DerivedProject {
  const packages = workPackages(s);
  const schedule = computeSchedule<string>(packages, s.project.info.startDate, statusDate);
  const groups = rollupGroups(Object.values(s.scope.wbs), schedule);
  const { milestoneToleranceDays } = resolveConfig(s.project.config).settings.schedule;
  const baseline = currentBaseline(s);

  const milestones: Record<string, DerivedMilestone> = {};
  for (const m of Object.values(s.schedule.milestones)) {
    const forecast = milestoneForecast(m, schedule);
    const baselineDate = baseline?.milestones[m.id]?.date ?? null;
    milestones[m.id] = {
      forecast,
      baselineDate,
      deviationDays: forecast && baselineDate ? diffDays(baselineDate, forecast) : null,
      status: milestoneStatus({
        actualDate: m.actualDate,
        forecast,
        baselineDate,
        statusDate,
        toleranceDays: milestoneToleranceDays,
      }),
      critical: milestoneIsCritical(m, schedule),
    };
  }

  const actual = physicalProgress(packages);
  const planned = baseline ? plannedProgress(baseline.workPackages, statusDate) : null;
  return {
    statusDate,
    schedule,
    groups,
    milestones,
    progress: { actual, planned, spi: physicalSpi(actual, planned) },
    sCurve: baseline ? physicalSCurve(baseline.workPackages, actual, statusDate) : [],
  };
}
