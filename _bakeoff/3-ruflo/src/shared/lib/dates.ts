/** Data ISO `YYYY-MM-DD`; toda a aritmética é feita em UTC. */
export type IsoDate = string;

const DAY_MS = 86_400_000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

function toUtcMs(d: IsoDate): number {
  return Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)) - 1, Number(d.slice(8, 10)));
}

function fromUtcMs(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtcMs(toUtcMs(d) + n * DAY_MS);
}

/** Dias de `from` até `to` (to − from). */
export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / DAY_MS);
}

export function maxDate(...ds: IsoDate[]): IsoDate {
  return ds.reduce((a, b) => (b > a ? b : a));
}

export function minDate(...ds: IsoDate[]): IsoDate {
  return ds.reduce((a, b) => (b < a ? b : a));
}

export function isIsoDate(s: unknown): s is IsoDate {
  return typeof s === 'string' && ISO_RE.test(s) && fromUtcMs(toUtcMs(s)) === s;
}

export function formatDateBR(d: IsoDate | null | undefined): string {
  if (!d) return '—';
  return `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
}

/** Único ponto que lê o relógio (usado apenas em `app/main.tsx`). */
export function todayIso(): IsoDate {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${mm}-${dd}`;
}

/** Segunda-feira da semana de `d`. */
export function startOfWeek(d: IsoDate): IsoDate {
  const weekday = new Date(toUtcMs(d)).getUTCDay(); // 0 = domingo
  return addDays(d, -((weekday + 6) % 7));
}

/** Chave do mês: `'2026-10'`. */
export function monthKey(d: IsoDate): string {
  return d.slice(0, 7);
}
