import { worstRag, type Alert, type Indicator, type Rag } from '@/core/indicators';
import { IMPLEMENTED_MODULES, MANIFESTS, type ImplementedModuleId } from '@/project/registry';
import type { AnalysisContext } from './context';
import { INDICATORS } from './indicators/registry';

export type Dashboard = {
  overall: Rag;
  perModule: { id: ImplementedModuleId; label: string; rag: Rag; reason: string }[];
  kpis: Indicator[];
  alerts: Alert[];
};

/** RAG geral, KPIs e alertas dos módulos ligados. */
export function computeDashboard(ctx: AnalysisContext): Dashboard {
  const active = IMPLEMENTED_MODULES.filter((id) => ctx.config.enabled[id]);
  const results = active.map((id) => ({ id, ind: INDICATORS[id](ctx) }));
  return {
    overall: worstRag(results.map((r) => r.ind.rag)),
    perModule: results.map(({ id, ind }) => ({ id, label: MANIFESTS[id].label, rag: ind.rag, reason: ind.ragReason })),
    kpis: results.flatMap((r) => r.ind.kpis),
    alerts: results.flatMap((r) => r.ind.alerts),
  };
}
