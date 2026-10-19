import type { MilestoneId } from '@/core/ids';
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
import { diffDays, type IsoDate } from '@/shared/lib/dates';
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
  milestones: Record<MilestoneId, DerivedMilestone>;
  progress: { actual: number | null; planned: number | null; spi: number | null };
  sCurve: SCurvePoint[];
};

/** Projeção pura do snapshot na data de status (SPEC §8). Nunca lança. */
export function deriveProject(s: ProjectSnapshot, statusDate: IsoDate): DerivedProject {
  const nodes = Object.values(s.scope.wbs);
  const packages = nodes.filter((n) => n.kind === 'Pacote de trabalho');
  const schedule = computeSchedule(packages, s.project.info.startDate, statusDate);
  const baseline = currentBaseline(s);
  const { settings } = resolveConfig(s.project.config);

  const milestones = {} as Record<MilestoneId, DerivedMilestone>;
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
        toleranceDays: settings.schedule.milestoneToleranceDays,
      }),
      critical: milestoneIsCritical(m, schedule),
    };
  }

  const actual = physicalProgress(packages);
  const planned = baseline ? plannedProgress(baseline.workPackages, statusDate) : null;
  return {
    statusDate,
    schedule,
    groups: rollupGroups(nodes, schedule),
    milestones,
    progress: { actual, planned, spi: physicalSpi(actual, planned) },
    sCurve: baseline ? physicalSCurve(baseline.workPackages, actual, statusDate) : [],
  };
}
