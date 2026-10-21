import type { ModuleIndicators } from '@/core/indicators';
import { exposure, isOpen, risksRag } from '@/modules/risks';
import type { AnalysisContext } from '../alerts/types';

export function risksIndicators({ snapshot, derived, config }: AnalysisContext): ModuleIndicators {
  const settings = config.settings.risks;
  const risks = Object.values(snapshot.risks.risks);
  const open = risks.filter(isOpen);
  const inBand = (band: string) =>
    open.filter((r) => {
      const e = exposure(r, settings);
      return e !== 'Não avaliado' && e.band === band;
    }).length;
  const kpis: ModuleIndicators['kpis'] = [
    { id: 'risks.critical', label: 'Riscos críticos abertos', value: inBand('Crítico'), format: 'count' },
    { id: 'risks.high', label: 'Riscos altos abertos', value: inBand('Alto'), format: 'count' },
    { id: 'risks.emv', label: 'Valor esperado dos riscos abertos', value: derived.risks?.openEmv ?? 0, format: 'money' },
  ];
  const { rag, reason } = risksRag(risks, settings);
  return { rag, ragReason: reason, kpis, alerts: [] };
}
