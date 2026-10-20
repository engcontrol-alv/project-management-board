import type { Rag } from '@/core/indicators';
import { formatRatio } from '@/shared/lib/format';
import type { Contingency } from './contingency';
import type { Evm } from './evm';
import type { MoneySummary } from './money-summary';

/** RAG de Finanças (SPEC §9.1). */
export function financesRag(
  evm: Evm,
  summary: MoneySummary,
  cont: Contingency,
  settings: { cpiGreenMin: number; cpiYellowMin: number },
): { rag: Rag; reason: string } {
  if (summary.costItemCount === 0) return { rag: 'n/a', reason: 'Nenhum item de custo cadastrado' };
  if (evm.cpi !== null && evm.cpi < settings.cpiYellowMin)
    return { rag: 'vermelho', reason: `CPI ${formatRatio(evm.cpi)} abaixo de ${formatRatio(settings.cpiYellowMin)}` };
  if (cont.consumedPct !== null && cont.consumedPct > 100)
    return { rag: 'vermelho', reason: 'contingência consumida acima de 100%' };
  if (evm.cpi !== null && evm.cpi < settings.cpiGreenMin)
    return { rag: 'amarelo', reason: `CPI ${formatRatio(evm.cpi)} abaixo de ${formatRatio(settings.cpiGreenMin)}` };
  if (summary.total.committed > summary.total.budgeted)
    return { rag: 'amarelo', reason: 'comprometido acima do orçado' };
  return {
    rag: 'verde',
    reason: evm.cpi === null ? 'comprometido dentro do orçado' : `CPI ${formatRatio(evm.cpi)} e comprometido dentro do orçado`,
  };
}
