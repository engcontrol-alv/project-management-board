import type { ModuleIndicators } from '@/core/indicators';
import { financesRag } from '@/modules/finances';
import type { AnalysisContext } from '../alerts/types';

export function financesIndicators({ derived, config }: AnalysisContext): ModuleIndicators {
  const f = derived.finances;
  if (!f) return { rag: 'n/a', ragReason: 'Custos & Finanças desligado', kpis: [], alerts: [] };
  const { evm, summary } = f;
  const kpis: ModuleIndicators['kpis'] = [
    { id: 'finances.spi', label: 'SPI', value: evm.spi, format: 'ratio' },
    { id: 'finances.cpi', label: 'CPI', value: evm.cpi, format: 'ratio' },
    { id: 'finances.eac', label: 'EAC', value: evm.eac, format: 'money' },
    { id: 'finances.budgeted', label: 'Orçado', value: summary.total.budgeted, format: 'money' },
    { id: 'finances.committed', label: 'Comprometido', value: summary.total.committed, format: 'money' },
    { id: 'finances.actual', label: 'Realizado', value: summary.total.actual, format: 'money' },
  ];
  const { rag, reason } = financesRag(evm, summary, f.contingency, config.settings.finances);
  return { rag, ragReason: reason, kpis, alerts: [] };
}
