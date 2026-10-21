import type { Rag } from '@/core/indicators';
import { formatPercent } from '@/shared/lib/format';
import { peakOverallocation, type ResourceLoad } from './load';

/** RAG de Recursos (SPEC §9.1). */
export function resourcesRag(load: ResourceLoad[], settings: { overallocationRedPct: number }): { rag: Rag; reason: string } {
  const hasDemand = load.some((l) => l.weeks.some((w) => w.demandPct > 0));
  if (!hasDemand) return { rag: 'n/a', reason: 'Nenhuma alocação cadastrada' };
  const peak = peakOverallocation(load);
  if (peak === null) return { rag: 'verde', reason: 'nenhuma sobrealocação' };
  const over = load.filter((l) => l.weeks.some((w) => w.overPct !== null)).length;
  const reason = `${over} recurso(s) sobrealocado(s), pico de ${formatPercent(peak)}`;
  return { rag: peak > settings.overallocationRedPct ? 'vermelho' : 'amarelo', reason };
}
