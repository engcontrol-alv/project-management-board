import { monthKey } from '@/shared/lib/dates';
import type { CostItem } from './money-summary';

export type CashflowMonth = {
  month: string;
  plannedCost: number;
  actualCost: number;
  plannedRevenue: number;
  actualRevenue: number;
};

export type Cashflow = {
  months: CashflowMonth[];
  /** Códigos sem data prevista nem real (SPEC §13 caso 29). */
  undated: string[];
  /** Itens ligados a pacotes atrasados: "em risco de deslocamento" (SPEC §7.4). */
  atRisk: string[];
};

/** Fluxo de caixa mensal derivado: previsto na data prevista, realizado na data real. */
export function cashflow(items: CostItem[], latePackageIds: ReadonlySet<string> = new Set()): Cashflow {
  const byMonth = new Map<string, CashflowMonth>();
  const at = (month: string) => {
    let m = byMonth.get(month);
    if (!m) {
      m = { month, plannedCost: 0, actualCost: 0, plannedRevenue: 0, actualRevenue: 0 };
      byMonth.set(month, m);
    }
    return m;
  };
  const undated: string[] = [];
  const atRisk: string[] = [];
  for (const i of items) {
    const cost = i.kind === 'Custo';
    if (!i.plannedDate && !i.actualDate) {
      undated.push(i.code);
      continue;
    }
    if (i.plannedDate && !i.cancelled) {
      const m = at(monthKey(i.plannedDate));
      if (cost) m.plannedCost += i.budgeted;
      else m.plannedRevenue += i.budgeted;
    }
    if (i.actualDate && i.actual > 0) {
      const m = at(monthKey(i.actualDate));
      if (cost) m.actualCost += i.actual;
      else m.actualRevenue += i.actual;
    }
    if (i.workPackageId && latePackageIds.has(i.workPackageId) && !i.actualDate) atRisk.push(i.code);
  }
  return { months: [...byMonth.values()].sort((a, b) => a.month.localeCompare(b.month)), undated, atRisk };
}
