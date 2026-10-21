import type { ChangeRequestId } from '@/core/ids';
import type { Baseline } from '@/project/baseline';
import type { ProjectSnapshot } from '@/project/snapshot';
import { workPackages, type DerivedProject } from './derive';

/** Fotografia do plano atual como próxima versão da linha de base. */
export function snapshotBaseline(
  s: ProjectSnapshot,
  d: DerivedProject,
  args: { id: string; now: string; changeRequestId: ChangeRequestId | null },
): Baseline {
  const wp: Baseline['workPackages'] = {};
  if (d.schedule.ok) {
    for (const p of workPackages(s)) {
      const t = d.schedule.tasks[p.id];
      if (t) wp[p.id] = { start: t.start, finish: t.finish, duration: p.duration };
    }
  }
  const milestones: Baseline['milestones'] = {};
  for (const [id, m] of Object.entries(d.milestones)) if (m.forecast) milestones[id] = { date: m.forecast };
  const deliverables: Baseline['deliverables'] = {};
  for (const del of Object.values(s.scope.deliverables)) {
    deliverables[del.id] = { code: del.code, name: del.name, plannedDate: del.plannedDate };
  }
  return {
    id: args.id,
    projectId: s.project.id,
    version: s.baselines.length + 1,
    createdAt: args.now,
    changeRequestId: args.changeRequestId,
    projectFinish: d.schedule.ok ? d.schedule.projectFinish : null,
    workPackages: wp,
    milestones,
    costItems: {},
    deliverables,
  };
}
