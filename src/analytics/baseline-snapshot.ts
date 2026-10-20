import type { ChangeRequestId } from '@/core/ids';
import type { Baseline } from '@/project/baseline';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { DerivedProject } from './derive';

/** Fotografa o plano atual como próxima versão da linha de base. */
export function snapshotBaseline(
  s: ProjectSnapshot,
  d: DerivedProject,
  args: { id: string; now: string; changeRequestId: ChangeRequestId | null },
): Baseline {
  const workPackages: Baseline['workPackages'] = {};
  if (d.schedule.ok) {
    for (const n of Object.values(s.scope.wbs)) {
      const t = d.schedule.tasks[n.id];
      if (n.kind === 'Pacote de trabalho' && t)
        workPackages[n.id] = { start: t.start, finish: t.finish, duration: n.duration };
    }
  }
  const milestones: Baseline['milestones'] = {};
  for (const [id, m] of Object.entries(d.milestones))
    if (m.forecast) milestones[id as keyof typeof milestones] = { date: m.forecast };
  // Linha de base de custos: linhas de custo e contratações não canceladas (SPEC §7.3).
  const costItems: Baseline['costItems'] = {};
  for (const l of Object.values(s.finances.budgetLines))
    if (l.kind === 'Custo' && l.status !== 'Cancelado')
      costItems[l.id] = { budgetedCents: l.budgetedCents, currency: l.currency, rate: l.rate ?? 1 };
  for (const p of Object.values(s.finances.procurements))
    if (p.contractStatus !== 'Cancelado')
      costItems[p.id] = { budgetedCents: p.budgetedCents, currency: p.currency, rate: p.rate ?? 1 };
  const deliverables: Baseline['deliverables'] = {};
  for (const e of Object.values(s.scope.deliverables))
    deliverables[e.id] = { code: e.code, name: e.name, plannedDate: e.plannedDate };

  return {
    id: args.id,
    projectId: s.project.id,
    version: s.baselines.length + 1,
    createdAt: args.now,
    changeRequestId: args.changeRequestId,
    projectFinish: d.schedule.ok ? d.schedule.projectFinish : null,
    workPackages,
    milestones,
    costItems,
    deliverables,
  };
}
