function isNumber(n: number | null | undefined): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

export function formatRatio(n: number | null | undefined): string {
  if (!isNumber(n)) return 'n/a';
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatPercent(n: number | null | undefined): string {
  if (!isNumber(n)) return 'n/a';
  return `${n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

export function formatCount(n: number | null | undefined): string {
  if (!isNumber(n)) return 'n/a';
  return n.toLocaleString('pt-BR');
}
