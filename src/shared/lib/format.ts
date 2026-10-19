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
