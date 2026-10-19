import type { Rag } from '@/core/indicators';
import { formatRatio } from '@/shared/lib/format';
import type { MilestoneStatus } from './progress';

export function scheduleRag(a: {
  spi: number | null;
  milestones: { status: MilestoneStatus; critical: boolean }[];
  greenMin: number;
  yellowMin: number;
}): { rag: Rag; reason: string } {
  const late = a.milestones.filter((m) => m.status === 'Atrasado');
  const criticalLate = late.filter((m) => m.critical);
  if (criticalLate.length > 0)
    return { rag: 'vermelho', reason: `${criticalLate.length} marco(s) crítico(s) atrasado(s)` };
  if (a.spi !== null && a.spi < a.yellowMin)
    return {
      rag: 'vermelho',
      reason: `SPI físico ${formatRatio(a.spi)} abaixo de ${formatRatio(a.yellowMin)}`,
    };
  if (a.spi === null && a.milestones.length === 0)
    return { rag: 'n/a', reason: 'Sem linha de base e sem marcos' };
  if (late.length > 0)
    return { rag: 'amarelo', reason: `${late.length} marco(s) não crítico(s) atrasado(s)` };
  if (a.spi !== null && a.spi < a.greenMin)
    return {
      rag: 'amarelo',
      reason: `SPI físico ${formatRatio(a.spi)} abaixo de ${formatRatio(a.greenMin)}`,
    };
  return {
    rag: 'verde',
    reason: a.spi === null ? 'Nenhum marco atrasado (sem linha de base)' : `SPI físico ${formatRatio(a.spi)}`,
  };
}
