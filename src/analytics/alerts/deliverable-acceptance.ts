import { acceptanceIssues } from '@/modules/scope';
import type { AlertRule } from './types';

/** Entregável físico dado como entregue/aceito com TAF/FAT ou TAC/SAT pendente ou reprovado (D4). */
export const deliverableAcceptance: AlertRule = {
  id: 'deliverable-acceptance',
  requires: ['scope'],
  evaluate: ({ snapshot }) =>
    Object.values(snapshot.scope.deliverables)
      .sort((a, b) => a.code.localeCompare(b.code))
      .flatMap((d) =>
        acceptanceIssues(d).map((i) => ({
          id: `deliverable-acceptance:${d.id}:${i.test}`,
          severity: i.severity,
          message: `${d.code} ${d.status === 'Aceito pelo cliente' ? 'aceito pelo cliente' : 'concluído'} com ${i.test} ${i.status}`,
          action: { kind: 'openRecord' as const, module: 'scope', collection: 'deliverables', id: d.id },
        })),
      ),
};
