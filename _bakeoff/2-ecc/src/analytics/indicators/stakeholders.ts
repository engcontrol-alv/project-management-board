import type { ModuleIndicators } from '@/core/indicators';
import type { AnalysisContext } from '../context';

export function stakeholdersIndicators(_ctx: AnalysisContext): ModuleIndicators {
  return { rag: 'n/a', ragReason: 'Análise disponível na Etapa 2', kpis: [], alerts: [] };
}
