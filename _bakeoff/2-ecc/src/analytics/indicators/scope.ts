import type { ModuleIndicators } from '@/core/indicators';
import { isDeliverableDone, isPendingCr, scopeRag } from '@/modules/scope';
import { moduleAlerts } from '../alerts';
import type { AnalysisContext } from '../context';

export function scopeIndicators(ctx: AnalysisContext): ModuleIndicators {
  const { scope } = ctx.snapshot;
  const reqs = Object.values(scope.requirements);
  const { rag, reason } = scopeRag(reqs);
  const deliverables = Object.values(scope.deliverables).filter((d) => d.status !== 'Cancelado');
  const done = deliverables.filter(isDeliverableDone).length;
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
        value: deliverables.length ? (done / deliverables.length) * 100 : null,
        format: 'percent',
      },
      {
        id: 'scope.pendingChanges',
        label: 'Mudanças pendentes',
        value: Object.values(scope.changeRequests).filter((c) => isPendingCr(c.status)).length,
        format: 'count',
      },
    ],
    alerts: moduleAlerts(ctx, 'scope'),
  };
}
