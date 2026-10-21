/** Data de calendário ISO `YYYY-MM-DD`; toda aritmética é em UTC. */
export type IsoDate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 86_400_000;

function toUtc(d: IsoDate): number {
  const m = ISO_RE.exec(d);
  if (!m) throw new Error(`Data inválida: ${d}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function fromUtc(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

export function isIsoDate(s: unknown): s is IsoDate {
  if (typeof s !== 'string' || !ISO_RE.test(s)) return false;
  return fromUtc(toUtc(s)) === s;
}

export function addDays(d: IsoDate, n: number): IsoDate {
  return fromUtc(toUtc(d) + n * DAY_MS);
}

export function diffDays(from: IsoDate, to: IsoDate): number {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

export function maxDate(...dates: IsoDate[]): IsoDate {
  return dates.reduce((a, b) => (b > a ? b : a));
}

export function minDate(...dates: IsoDate[]): IsoDate {
  return dates.reduce((a, b) => (b < a ? b : a));
}

export function formatDateBR(d: IsoDate | null | undefined): string {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

/** Único ponto que lê o relógio; usado apenas no bootstrap da aplicação. */
export function todayIso(): IsoDate {
  const now = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}`;
}
