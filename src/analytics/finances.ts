import {
  cashflow,
  computeEvm,
  contingency,
  moneySummary,
  unlinkedCostPct,
  type Cashflow,
  type Contingency,
  type CostItem,
  type Evm,
  type EvmPackage,
  type MoneySummary,
} from '@/modules/finances';
import type { ScheduleResult } from '@/modules/schedule';
import { addDays, diffDays, maxDate, minDate, type IsoDate } from '@/shared/lib/dates';
import { toBaseCents } from '@/shared/lib/money';
import type { Baseline } from '@/project/baseline';
import type { ProjectSnapshot } from '@/project/snapshot';

export type MoneyPoint = { date: IsoDate; pv: number; ev: number | null; ac: number | null };

export type DerivedFinances = {
  baseCurrency: string;
  items: CostItem[];
  evm: Evm;
  summary: MoneySummary;
  cashflow: Cashflow;
  contingency: Contingency;
  unlinkedCostPct: number | null;
  moneySCurve: MoneyPoint[];
};

const toBase = (cents: number, currency: string, rate: number | null, base: string) =>
  currency === base ? cents : toBaseCents(cents, rate ?? 1);

/** Linhas de orçamento e contratações na moeda base, no formato estrutural do domínio de Finanças. */
export function toCostItems(s: ProjectSnapshot, baseCurrency: string): CostItem[] {
  const lines: CostItem[] = Object.values(s.finances.budgetLines).map((l) => ({
    id: l.id,
    code: l.code,
    kind: l.kind,
    nature: l.nature,
    category: l.category,
    budgeted: toBase(l.budgetedCents, l.currency, l.rate, baseCurrency),
    committed: null,
    actual: toBase(l.actualCents, l.currency, l.rate, baseCurrency),
    cancelled: l.status === 'Cancelado',
    plannedDate: l.plannedDate,
    actualDate: l.actualDate,
    workPackageId: l.workPackageId,
    source: 'budgetLine',
  }));
  const procurements: CostItem[] = Object.values(s.finances.procurements).map((p) => ({
    id: p.id,
    code: p.code,
    kind: 'Custo',
    nature: p.nature,
    category: p.type === 'Serviço' ? 'Contratação de serviço' : 'Contratação de produto',
    budgeted: toBase(p.budgetedCents, p.currency, p.rate, baseCurrency),
    committed: toBase(p.committedCents, p.currency, p.rate, baseCurrency),
    actual: toBase(p.actualCents, p.currency, p.rate, baseCurrency),
    cancelled: p.contractStatus === 'Cancelado',
    plannedDate: p.dueDate,
    actualDate: p.completionDate,
    workPackageId: p.workPackageId,
    source: 'procurement',
  }));
  return [...lines, ...procurements];
}

/** Pacotes com término previsto depois do término da LB (atrasados). */
export function latePackageIds(schedule: ScheduleResult, baseline: Baseline | null): Set<string> {
  const late = new Set<string>();
  if (!schedule.ok || !baseline) return late;
  for (const [id, b] of Object.entries(baseline.workPackages)) {
    const t = schedule.tasks[id];
    if (t && t.finish > b.finish) late.add(id);
  }
  return late;
}

/**
 * Pacotes do EVM (D6): com LB, o BAC de cada pacote vem do orçado fotografado na LB; itens criados
 * depois da LB entram como uma parcela "fora da linha de base" (PV 0). Sem LB, orçado atual e PV n/a.
 */
function evmPackages(s: ProjectSnapshot, items: CostItem[], baseline: Baseline | null, baseCurrency: string): EvmPackage[] {
  const out: EvmPackage[] = [];
  for (const n of Object.values(s.scope.wbs)) {
    if (n.kind !== 'Pacote de trabalho') continue;
    const linked = items.filter((i) => i.kind === 'Custo' && !i.cancelled && i.workPackageId === n.id);
    let inLb = 0;
    let outside = 0;
    for (const i of linked) {
      const snap = baseline?.costItems[i.id];
      if (snap) inLb += toBase(snap.budgetedCents, snap.currency, snap.rate, baseCurrency);
      else outside += i.budgeted;
    }
    const dates = baseline?.workPackages[n.id] ?? null;
    if (baseline) {
      if (dates) out.push({ id: n.id, percentComplete: n.percentComplete, bac: inLb, baseline: dates });
      else outside += inLb;
      if (outside > 0) out.push({ id: `${n.id}#fora-da-lb`, percentComplete: n.percentComplete, bac: outside, baseline: null });
    } else {
      out.push({ id: n.id, percentComplete: n.percentComplete, bac: outside, baseline: null });
    }
  }
  return out;
}

function actualByPackage(items: CostItem[], until?: IsoDate): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items)
    if (i.kind === 'Custo' && i.workPackageId && (!until || (i.actualDate && i.actualDate <= until)))
      out[i.workPackageId] = (out[i.workPackageId] ?? 0) + i.actual;
  return out;
}

/** Curva S monetária semanal: PV da LB, AC pelas datas reais e EV interpolado até a data de status. */
function moneySCurve(pkgs: EvmPackage[], items: CostItem[], evNow: number, statusDate: IsoDate): MoneyPoint[] {
  const withLb = pkgs.filter((p) => p.baseline);
  if (withLb.length === 0 || pkgs.reduce((s, p) => s + p.bac, 0) === 0) return [];
  const start = minDate(...withLb.map((p) => p.baseline!.start));
  const end = maxDate(...withLb.map((p) => p.baseline!.finish));
  const dates = new Set<IsoDate>();
  for (let d = start; d < end; d = addDays(d, 7)) dates.add(d);
  dates.add(end);
  if (statusDate >= start) dates.add(statusDate);
  const span = diffDays(start, statusDate);
  return [...dates].sort().map((date) => {
    const past = date <= statusDate;
    const ev = past ? (span <= 0 ? evNow : (evNow * diffDays(start, date)) / span) : null;
    const ac = past ? Object.values(actualByPackage(items, date)).reduce((s, v) => s + v, 0) : null;
    return { date, pv: computeEvm(pkgs, {}, date).pv ?? 0, ev, ac };
  });
}

export function deriveFinances(
  s: ProjectSnapshot,
  args: {
    baseCurrency: string;
    baseline: Baseline | null;
    schedule: ScheduleResult;
    openRiskEmv: number;
    statusDate: IsoDate;
  },
): DerivedFinances {
  const items = toCostItems(s, args.baseCurrency);
  const pkgs = evmPackages(s, items, args.baseline, args.baseCurrency);
  const actual = actualByPackage(items);
  // Parcelas "fora da LB" compartilham o realizado do pacote: atribuído só à principal.
  const evm = computeEvm(pkgs, actual, args.statusDate);
  return {
    baseCurrency: args.baseCurrency,
    items,
    evm,
    summary: moneySummary(items),
    cashflow: cashflow(items, latePackageIds(args.schedule, args.baseline)),
    contingency: contingency(items, args.openRiskEmv),
    unlinkedCostPct: unlinkedCostPct(items),
    moneySCurve: moneySCurve(pkgs, items, evm.ev, args.statusDate),
  };
}
