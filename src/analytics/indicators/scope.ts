import type { ModuleIndicators } from '@/core/indicators';
import { isPendingCr } from '@/modules/governance';
import { scopeRag } from '@/modules/scope';
import type { AnalysisContext } from '../alerts/types';

export function scopeIndicators({ snapshot }: AnalysisContext): ModuleIndicators {
  const reqs = Object.values(snapshot.scope.requirements);
  const { rag, reason } = scopeRag(reqs);
  const deliverables = Object.values(snapshot.scope.deliverables).filter((d) => d.status !== 'Cancelado');
  const done = deliverables.filter((d) => d.status === 'Aprovado' || d.status === 'Aceito pelo cliente');
  return {
    rag,
    ragReason: reason,
    kpis: [
      {
        id: 'scope.gaps',
        label: 'Requisitos com gap',
        value: reqs.filter((r) => r.fulfillmentStatus === 'Não atendido (gap)').length,
        format: 'count',
      },
      {
        id: 'scope.deliverables',
        label: '% entregáveis concluídos',
        value: deliverables.length ? (done.length / deliverables.length) * 100 : null,
        format: 'percent',
      },
      {
        id: 'scope.pendingChanges',
        label: 'Mudanças pendentes',
        value: Object.values(snapshot.governance.changeRequests).filter((c) => isPendingCr(c.status)).length,
        format: 'count',
      },
    ],
    alerts: [],
  };
}
