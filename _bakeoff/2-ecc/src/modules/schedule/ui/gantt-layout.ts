import { addDays, diffDays, type IsoDate } from '@/shared/lib/dates';

export type GanttBar = { id: string; start: IsoDate; finish: IsoDate; zero?: boolean };

/** Posição horizontal das barras; término inclusivo, duração 0 vira losango (largura 0). */
export function ganttLayout(args: {
  rangeStart: IsoDate;
  rangeEnd: IsoDate;
  pxPerDay: number;
  bars: GanttBar[];
}): Record<string, { x: number; width: number }> {
  const out: Record<string, { x: number; width: number }> = {};
  for (const b of args.bars) {
    out[b.id] = {
      x: diffDays(args.rangeStart, b.start) * args.pxPerDay,
      width: b.zero ? 0 : (diffDays(b.start, b.finish) + 1) * args.pxPerDay,
    };
  }
  return out;
}

const KNOWN_MONDAY = '1970-01-05';

/** Intervalo exibido: da segunda-feira anterior à menor data até uma semana após a maior. */
export function ganttRange(dates: IsoDate[]): { start: IsoDate; end: IsoDate } | null {
  if (!dates.length) return null;
  const min = dates.reduce((a, b) => (b < a ? b : a));
  const max = dates.reduce((a, b) => (b > a ? b : a));
  const weekday = ((diffDays(KNOWN_MONDAY, min) % 7) + 7) % 7;
  return { start: addDays(min, -weekday), end: addDays(max, 7) };
}

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Primeiro dia de cada mês no intervalo (inclusive), para a régua superior do Gantt. */
export function monthStarts(start: IsoDate, end: IsoDate): { date: IsoDate; label: string }[] {
  const out: { date: IsoDate; label: string }[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  if (start.slice(8) !== '01') month += 1;
  for (;;) {
    if (month > 12) {
      month = 1;
      year += 1;
    }
    const date = `${year}-${String(month).padStart(2, '0')}-01` as IsoDate;
    if (date > end) return out;
    out.push({ date, label: `${MONTHS[month - 1]} ${year}` });
    month += 1;
  }
}
