import type { AlertRule } from './types';

const openProcurement = (id: string) => ({ kind: 'openRecord' as const, module: 'finances', collection: 'procurements', id });

/** "Entrega de CTR-005 ameaça o marco M-003" (SPEC §9.2). */
export const procurementThreatensMilestone: AlertRule = {
  id: 'procurement-threatens-milestone',
  requires: ['finances', 'schedule'],
  evaluate: ({ snapshot, derived }) =>
    Object.values(snapshot.finances.procurements).flatMap((p) => {
      if (!p.milestoneId || !p.dueDate || p.completionDate || p.contractStatus === 'Cancelado') return [];
      const m = snapshot.schedule.milestones[p.milestoneId];
      const d = derived.milestones[p.milestoneId];
      if (!m || !d?.forecast || d.status === 'Concluído' || p.dueDate <= d.forecast) return [];
      return [
        {
          id: `procurement-threatens-milestone:${p.id}`,
          severity: d.critical ? ('vermelho' as const) : ('amarelo' as const),
          message: `Entrega de ${p.code} ameaça o marco ${m.code}`,
          action: openProcurement(p.id),
        },
      ];
    }),
};

/** "CTR-005 comprometido acima do orçado" (SPEC §9.2, caso 17). */
export const procurementOverBudget: AlertRule = {
  id: 'procurement-over-budget',
  requires: ['finances'],
  evaluate: ({ snapshot }) =>
    Object.values(snapshot.finances.procurements)
      .filter((p) => p.contractStatus !== 'Cancelado' && p.committedCents > p.budgetedCents)
      .map((p) => ({
        id: `procurement-over-budget:${p.id}`,
        severity: 'amarelo' as const,
        message: `${p.code} comprometido acima do orçado`,
        action: openProcurement(p.id),
      })),
};
