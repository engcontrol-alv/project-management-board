/**
 * Converte texto no padrão pt-BR ("R$ 1.234,56", "-10,5", "1234") para centavos.
 * Devolve `null` quando o texto não é um valor monetário.
 */
export function parseMoneyBR(input: string): number | null {
  let s = input.replace(/R\$/gi, '').replace(/\s/g, '');
  if (s === '') return null;
  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '');
  }
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return null;
  const cents = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return negative ? -cents : cents;
}

export function formatMoneyBR(cents: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency })
    .format(cents / 100)
    .replace(/\s/g, ' '); // Intl usa espaço não separável
}

/** Centavos para o texto editável de um campo ("1234,56"). */
export function centsToInput(cents: number | null): string {
  if (cents === null) return '';
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/** Arredonda para o inteiro mais próximo; empates vão para o par (absorve ruído de ponto flutuante). */
export function roundHalfEven(x: number): number {
  const floor = Math.floor(x);
  const diff = x - floor;
  if (Math.abs(diff - 0.5) < 1e-9) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(x);
}

/** Centavos na moeda do item → centavos na moeda base (taxa decimal informada no item). */
export function toBaseCents(cents: number, rate: number): number {
  return roundHalfEven(cents * rate);
}
