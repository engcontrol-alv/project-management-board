import type { ModuleIndicators } from '@/core/indicators';
import { communicationStatus, hasEngagementGap, quadrant } from '@/modules/stakeholders';
import { hasCommunicationPlan } from '../alerts/supplier-alerts';
import type { AnalysisContext } from '../alerts/types';

/** RAG de Partes Interessadas (SPEC §9.1). */
export function stakeholdersIndicators({ snapshot, derived }: AnalysisContext): ModuleIndicators {
  const analyzed = Object.values(snapshot.stakeholders.parties).filter((p) => p.analysis);
  const late = Object.values(snapshot.stakeholders.communications).filter(
    (c) => communicationStatus(c, derived.statusDate) === 'Atrasada',
  );
  const kpis: ModuleIndicators['kpis'] = [
    {
      id: 'stakeholders.gaps',
      label: 'Lacunas de engajamento',
      value: analyzed.filter((p) => hasEngagementGap(p.analysis!)).length,
      format: 'count',
    },
    { id: 'stakeholders.lateComms', label: 'Comunicações atrasadas', value: late.length, format: 'count' },
  ];
  if (analyzed.length === 0)
    return { rag: 'n/a', ragReason: 'Nenhuma parte interessada analisada', kpis, alerts: [] };
  const close = analyzed.filter((p) => quadrant(p.analysis!) === 'Gerenciar de perto');
  const opposing = close.filter((p) => p.analysis!.currentPosture === 'Opositor').length;
  if (opposing > 0)
    return { rag: 'vermelho', ragReason: `${opposing} parte(s) em "Gerenciar de perto" com postura Opositor`, kpis, alerts: [] };
  const uncovered = close.filter((p) => !hasCommunicationPlan(snapshot, p.id)).length;
  if (uncovered > 0)
    return {
      rag: 'amarelo',
      ragReason: `${uncovered} parte(s) em "Gerenciar de perto" sem plano de comunicação`,
      kpis,
      alerts: [],
    };
  return { rag: 'verde', ragReason: 'partes-chave com plano de comunicação', kpis, alerts: [] };
}
