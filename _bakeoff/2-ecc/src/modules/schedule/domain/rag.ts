import type { RagResult } from '@/core/indicators';
import { formatRatio } from '@/shared/lib/format';
import type { MilestoneStatus } from './progress';

export function scheduleRag(args: {
  spi: number | null;
  milestones: { status: MilestoneStatus; critical: boolean }[];
  greenMin: number;
  yellowMin: number;
}): RagResult {
  const { spi, milestones, greenMin, yellowMin } = args;
  if (spi === null && !milestones.length) return { rag: 'n/a', reason: 'Sem linha de base nem marcos' };
  const late = milestones.filter((m) => m.status === 'Atrasado');
  const criticalLate = late.filter((m) => m.critical).length;
  const spiText = spi === null ? 'SPI físico n/a' : `SPI físico ${formatRatio(spi)}`;
  const reasons = [spiText];
  if (criticalLate) reasons.push(`${criticalLate} marco(s) crítico(s) atrasado(s)`);
  if (late.length - criticalLate) reasons.push(`${late.length - criticalLate} marco(s) não crítico(s) atrasado(s)`);
  const reason = reasons.join('; ');
  if ((spi !== null && spi < yellowMin) || criticalLate) return { rag: 'vermelho', reason };
  if ((spi !== null && spi < greenMin) || late.length) return { rag: 'amarelo', reason };
  return { rag: 'verde', reason: late.length ? reason : `${spiText}; nenhum marco atrasado` };
}
