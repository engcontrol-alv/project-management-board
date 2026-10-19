import { isDocument } from '@/modules/scope';
import type { AlertRule } from './types';

export const deliverableOverdue: AlertRule = {
  id: 'deliverable-overdue',
  requires: ['scope'],
  evaluate: ({ snapshot, derived }) =>
    Object.values(snapshot.scope.deliverables)
      .filter(
        (d) =>
          isDocument(d) &&
          d.plannedDate !== null &&
          d.plannedDate < derived.statusDate &&
          !d.actualDate &&
          d.status !== 'Aprovado' &&
          d.status !== 'Cancelado',
      )
      .map((d) => ({
        id: `deliverable-overdue:${d.id}`,
        severity: 'amarelo' as const,
        message: `${d.code} vencido sem aprovação`,
        action: { kind: 'openRecord' as const, module: 'scope', collection: 'deliverables', id: d.id },
      })),
};
