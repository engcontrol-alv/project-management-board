import { worstRag, type Alert, type Indicator, type Rag } from '@/core/indicators';
import { isReadOnly } from '@/modules/governance';
import type { IsoDate } from '@/shared/lib/dates';
import { resolveConfig } from '@/project/config';
import { MANIFESTS, MODULE_ORDER, type ImplementedModuleId } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';
import { ALERT_RULES } from './alerts';
import type { AnalysisContext } from './alerts/types';
import { deriveProject } from './derive';
import { INDICATORS } from './indicators/registry';

export function buildContext(snapshot: ProjectSnapshot, statusDate: IsoDate): AnalysisContext {
  return {
    snapshot,
    derived: deriveProject(snapshot, statusDate),
    config: resolveConfig(snapshot.project.config),
  };
}

export type Dashboard = {
  overall: Rag;
  perModule: { id: ImplementedModuleId; label: string; rag: Rag; reason: string }[];
  kpis: Indicator[];
  alerts: Alert[];
};

/** RAG geral, KPIs e alertas apenas dos módulos ligados. Projeto encerrado oculta alertas. */
export function computeDashboard(ctx: AnalysisContext): Dashboard {
  const active = MODULE_ORDER.filter((id) => ctx.config.enabled[id]);
  const results = active.map((id) => ({ id, ind: INDICATORS[id](ctx) }));
  const alerts = isReadOnly(ctx.snapshot.governance.profile)
    ? []
    : ALERT_RULES.filter((r) => r.requires.every((m) => ctx.config.enabled[m])).flatMap((r) =>
        r.evaluate(ctx),
      );
  return {
    overall: worstRag(results.map((r) => r.ind.rag)),
    perModule: results.map(({ id, ind }) => ({
      id,
      label: MANIFESTS[id].label,
      rag: ind.rag,
      reason: ind.ragReason,
    })),
    kpis: results.flatMap((r) => r.ind.kpis),
    alerts: [...alerts, ...results.flatMap((r) => r.ind.alerts)],
  };
}
