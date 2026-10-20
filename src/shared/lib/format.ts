import { formatMoneyBR } from './money';

const ratioFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const percentFmt = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

function usable(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function formatRatio(n: number | null | undefined): string {
  return usable(n) ? ratioFmt.format(n) : 'n/a';
}

export function formatPercent(n: number | null | undefined): string {
  return usable(n) ? `${percentFmt.format(n)}%` : 'n/a';
}

export function formatCount(n: number | null | undefined): string {
  return usable(n) ? intFmt.format(n) : 'n/a';
}

export function formatDays(n: number | null | undefined): string {
  if (!usable(n)) return 'n/a';
  return `${intFmt.format(n)} ${Math.abs(n) === 1 ? 'dia' : 'dias'}`;
}

/** Formata um indicador pelo seu tipo; `money` vem em centavos da moeda base. */
export function formatIndicator(
  i: { format: string; value: number | null },
  currency = 'BRL',
): string {
  switch (i.format) {
    case 'ratio':
      return formatRatio(i.value);
    case 'percent':
      return formatPercent(i.value);
    case 'days':
      return formatDays(i.value);
    case 'money':
      return usable(i.value) ? formatMoneyBR(i.value, currency) : 'n/a';
    default:
      return formatCount(i.value);
  }
}
