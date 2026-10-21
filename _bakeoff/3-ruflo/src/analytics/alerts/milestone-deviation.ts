import type { AlertRule } from './types';

export const milestoneDeviation: AlertRule = {
  id: 'milestone-deviation',
  requires: ['schedule'],
  evaluate: ({ snapshot, derived }) =>
    Object.values(snapshot.schedule.milestones).flatMap((m) => {
      const d = derived.milestones[m.id];
      if (!d || d.status === 'Concluído' || d.deviationDays === null || d.deviationDays <= 0) return [];
      return [
        {
          id: `milestone-deviation:${m.id}`,
          severity: d.status === 'Atrasado' ? ('vermelho' as const) : ('amarelo' as const),
          message: `Marco ${m.code} previsto ${d.deviationDays} dias após a linha de base — considerar solicitação de mudança`,
          action: { kind: 'openChangeRequest' as const },
        },
      ];
    }),
};
