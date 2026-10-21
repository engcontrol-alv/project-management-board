import type { ModuleIndicators } from '@/core/indicators';
import { governanceRag, staleChangeRequests } from '@/modules/governance';
import type { AnalysisContext } from '../alerts/types';

export function governanceIndicators({ snapshot, derived, config }: AnalysisContext): ModuleIndicators {
  if (!config.enabled.scope)
    return { rag: 'n/a', ragReason: 'Escopo desligado', kpis: [], alerts: [] };
  const stale = staleChangeRequests(
    Object.values(snapshot.scope.changeRequests),
    derived.statusDate,
    config.settings.governance.staleChangeDays,
  );
  const { rag, reason } = governanceRag(stale.length);
  return {
    rag,
    ragReason: reason,
    kpis: [{ id: 'governance.stale', label: 'Mudanças paradas', value: stale.length, format: 'count' }],
    alerts: [],
  };
}
