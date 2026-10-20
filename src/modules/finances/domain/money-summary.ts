import type { IsoDate } from '@/shared/lib/dates';
import type { Nature } from '../model/budget-line';

/**
 * Item financeiro já convertido para a moeda base (centavos). Linhas de orçamento não têm
 * comprometido (`null`); contratações têm. Montado em `analytics` a partir do snapshot.
 */
export type CostItem = {
  id: string;
  code: string;
  kind: 'Custo' | 'Receita';
  nature: Nature;
  category: string;
  budgeted: number;
  committed: number | null;
  actual: number;
  cancelled: boolean;
  plannedDate: IsoDate | null;
  actualDate: IsoDate | null;
  workPackageId: string | null;
  source: 'budgetLine' | 'procurement';
};

export type Totals = { budgeted: number; committed: number; actual: number };

export type MoneySummary = {
  total: Totals;
  byNature: Record<Nature, Totals>;
  byCategory: Record<string, Totals>;
  /** Σ por item de custo de `orçado − max(comprometido, realizado)`. */
  freeBalance: number;
  costItemCount: number;
};

const zero = (): Totals => ({ budgeted: 0, committed: 0, actual: 0 });

/** Orçado × comprometido × realizado (SPEC §6.4c). Cancelado sai de orçado/comprometido; o realizado continua. */
export function moneySummary(items: CostItem[]): MoneySummary {
  const costs = items.filter((i) => i.kind === 'Custo');
  const total = zero();
  const byNature: Record<Nature, Totals> = { CAPEX: zero(), OPEX: zero() };
  const byCategory: Record<string, Totals> = {};
  let freeBalance = 0;
  for (const i of costs) {
    const budgeted = i.cancelled ? 0 : i.budgeted;
    const committed = i.cancelled ? 0 : (i.committed ?? 0);
    for (const t of [total, byNature[i.nature], (byCategory[i.category] ??= zero())]) {
      t.budgeted += budgeted;
      t.committed += committed;
      t.actual += i.actual;
    }
    freeBalance += budgeted - Math.max(committed, i.actual);
  }
  return { total, byNature, byCategory, freeBalance, costItemCount: costs.length };
}

/** % do custo orçado sem pacote (entra nos totais, fica fora do EVM). */
export function unlinkedCostPct(items: CostItem[]): number | null {
  const costs = items.filter((i) => i.kind === 'Custo' && !i.cancelled);
  const total = costs.reduce((s, i) => s + i.budgeted, 0);
  if (total === 0) return null;
  const unlinked = costs.filter((i) => !i.workPackageId).reduce((s, i) => s + i.budgeted, 0);
  return (unlinked / total) * 100;
}
