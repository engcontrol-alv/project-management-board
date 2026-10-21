const MONEY_RE = /^(-)?(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/;

/** Aceita "R$ 1.234,56", "-10,5", "1234"; devolve centavos inteiros ou null. */
export function parseMoneyBR(input: string): number | null {
  const s = input.replace(/R\$/g, '').replace(/\s/g, '');
  const m = MONEY_RE.exec(s);
  if (!m) return null;
  const units = Number(m[2]!.replace(/\./g, ''));
  const cents = Number((m[3] ?? '').padEnd(2, '0'));
  const value = units * 100 + cents;
  return m[1] ? -value : value;
}

export function formatMoneyBR(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

/** Valor em centavos para edição: 123456 → "1.234,56". */
export function centsToInput(cents: number | null): string {
  if (cents === null) return '';
  return new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    cents / 100,
  );
}
