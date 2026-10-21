import { isDocumentCategory } from '@/modules/scope';
import type { AlertRule } from './types';

export const deliverableOverdue: AlertRule = {
  id: 'deliverable-overdue',
  module: 'scope',
  requires: ['scope'],
  evaluate({ snapshot, derived }) {
    return Object.values(snapshot.scope.deliverables)
      .filter(
        (d) =>
          isDocumentCategory(d.category) &&
          d.plannedDate !== null &&
          d.plannedDate < derived.statusDate &&
          !d.actualDate &&
          d.status !== 'Aprovado' &&
          d.status !== 'Cancelado',
      )
      .map((d) => ({
        id: `deliverable-overdue:${d.id}`,
        severity: 'amarelo',
        message: `${d.code} vencido sem aprovação`,
        action: { kind: 'openRecord', module: 'scope', collection: 'deliverables', id: d.id },
      }));
  },
};
