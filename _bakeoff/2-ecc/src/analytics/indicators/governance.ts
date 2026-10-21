import type { ModuleIndicators } from '@/core/indicators';
import { governanceRag, staleChangeRequests } from '@/modules/governance';
import { moduleAlerts } from '../alerts';
import type { AnalysisContext } from '../context';

export function governanceIndicators(ctx: AnalysisContext): ModuleIndicators {
  const alerts = moduleAlerts(ctx, 'governance');
  if (!ctx.config.enabled.scope) return { rag: 'n/a', ragReason: 'Escopo desligado', kpis: [], alerts };
  const stale = staleChangeRequests(
    Object.values(ctx.snapshot.scope.changeRequests),
    ctx.derived.statusDate,
    ctx.config.settings.governance.staleChangeDays,
  );
  const { rag, reason } = governanceRag(stale.length);
  return {
    rag,
    ragReason: reason,
    kpis: [{ id: 'governance.staleChanges', label: 'Mudanças paradas', value: stale.length, format: 'count' }],
    alerts,
  };
}
