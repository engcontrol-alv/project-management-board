import { diffDays, type IsoDate } from '@/shared/lib/dates';

/** Posição horizontal das barras do Gantt; término inclusivo; duração 0 → largura 0 (losango). */
export function ganttLayout(a: {
  rangeStart: IsoDate;
  rangeEnd: IsoDate;
  pxPerDay: number;
  bars: { id: string; start: IsoDate; finish: IsoDate; zeroDuration?: boolean }[];
}): Record<string, { x: number; width: number }> {
  const out: Record<string, { x: number; width: number }> = {};
  for (const b of a.bars) {
    out[b.id] = {
      x: diffDays(a.rangeStart, b.start) * a.pxPerDay,
      width: b.zeroDuration ? 0 : (diffDays(b.start, b.finish) + 1) * a.pxPerDay,
    };
  }
  return out;
}
