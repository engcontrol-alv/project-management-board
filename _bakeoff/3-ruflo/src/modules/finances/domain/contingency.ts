import type { CostItem } from './money-summary';

export type Contingency = {
  reserve: number;
  consumed: number;
  balance: number;
  /** `null` sem reserva (n/a). */
  consumedPct: number | null;
  /** O saldo cobre o valor esperado dos riscos abertos. */
  coversRisks: boolean;
  openRiskEmv: number;
};

/** Reserva = linhas de categoria Contingência; comparada ao valor esperado dos riscos abertos (SPEC §6.4e). */
export function contingency(items: CostItem[], openRiskEmv: number): Contingency {
  const lines = items.filter((i) => i.kind === 'Custo' && i.category === 'Contingência' && !i.cancelled);
  const reserve = lines.reduce((s, i) => s + i.budgeted, 0);
  const consumed = lines.reduce((s, i) => s + i.actual, 0);
  const balance = reserve - consumed;
  return {
    reserve,
    consumed,
    balance,
    consumedPct: reserve > 0 ? (consumed / reserve) * 100 : null,
    coversRisks: openRiskEmv <= balance,
    openRiskEmv,
  };
}
