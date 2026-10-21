import { describe, expect, it } from 'vitest';
import { cashflow } from './cashflow';
import { contingency } from './contingency';
import { computeEvm, type EvmPackage } from './evm';
import { moneySummary, unlinkedCostPct, type CostItem } from './money-summary';
import { financesRag } from './rag';

const item = (o: Partial<CostItem>): CostItem => ({
  id: 'i',
  code: 'ORC-001',
  kind: 'Custo',
  nature: 'OPEX',
  category: 'Outro',
  budgeted: 0,
  committed: null,
  actual: 0,
  cancelled: false,
  plannedDate: null,
  actualDate: null,
  workPackageId: null,
  source: 'budgetLine',
  ...o,
});

const A: EvmPackage = {
  id: 'A',
  percentComplete: 40,
  bac: 100_000,
  baseline: { start: '2026-01-05', finish: '2026-01-14', duration: 10 },
};

describe('computeEvm', () => {
  it('caso canônico', () => {
    expect(computeEvm([A], { A: 50_000 }, '2026-01-09')).toEqual({
      bac: 100_000, pv: 50_000, ev: 40_000, ac: 50_000, spi: 0.8, cpi: 0.8,
      cv: -10_000, sv: -10_000, eac: 125_000, etc: 75_000, vac: -25_000,
    });
  });
  it('antes do início, sem custo real e BAC zero viram n/a, nunca Infinity', () => {
    const before = computeEvm([A], {}, '2026-01-01');
    expect(before.pv).toBe(0);
    expect(before.spi).toBeNull();
    expect(before.cpi).toBeNull();
    expect(before.eac).toBeNull();
    const zero = computeEvm([{ ...A, bac: 0 }], { A: 10 }, '2026-01-09');
    expect([zero.spi, zero.cpi, zero.eac]).toEqual([null, null, null]);
  });
  it('pacote fora da LB entra no EV com PV 0; sem LB nenhuma, PV n/a', () => {
    const r = computeEvm([A, { id: 'B', percentComplete: 50, bac: 20_000, baseline: null }], {}, '2026-01-09');
    expect(r.pv).toBe(50_000);
    expect(r.ev).toBe(50_000);
    const none = computeEvm([{ ...A, baseline: null }], {}, '2026-01-09');
    expect(none.pv).toBeNull();
    expect(none.sv).toBeNull();
  });
});

describe('moneySummary', () => {
  it('cancelada sai do orçado e do comprometido, mas o realizado continua; receita fora', () => {
    const s = moneySummary([
      item({ source: 'procurement', budgeted: 10_000, committed: 8_000, actual: 3_000, cancelled: true }),
      item({ kind: 'Receita', budgeted: 99_000 }),
    ]);
    expect(s.total).toEqual({ budgeted: 0, committed: 0, actual: 3_000 });
  });
  it('saldo livre usa o maior entre comprometido e realizado', () => {
    const s = moneySummary([
      item({ source: 'procurement', nature: 'CAPEX', budgeted: 10_000, committed: 12_000, actual: 5_000 }),
      item({ budgeted: 4_000, actual: 1_000 }),
    ]);
    expect(s.freeBalance).toBe(-2_000 + 3_000);
    expect(s.byNature.CAPEX.committed).toBe(12_000);
    expect(s.byNature.OPEX.budgeted).toBe(4_000);
  });
  it('% do custo não vinculado a pacotes', () => {
    expect(unlinkedCostPct([item({ budgeted: 300, workPackageId: 'A' }), item({ budgeted: 100 })])).toBe(25);
    expect(unlinkedCostPct([])).toBeNull();
  });
});

describe('cashflow', () => {
  it('previsto pela data prevista, realizado pela data real; sem datas vai para a lista', () => {
    const r = cashflow([
      item({ budgeted: 1_000, actual: 900, plannedDate: '2026-02-10', actualDate: '2026-03-02' }),
      item({ code: 'CTR-002', budgeted: 500 }),
      item({ kind: 'Receita', budgeted: 2_000, plannedDate: '2026-03-15' }),
    ]);
    expect(r.months).toEqual([
      { month: '2026-02', plannedCost: 1_000, actualCost: 0, plannedRevenue: 0, actualRevenue: 0 },
      { month: '2026-03', plannedCost: 0, actualCost: 900, plannedRevenue: 2_000, actualRevenue: 0 },
    ]);
    expect(r.undated).toEqual(['CTR-002']);
  });
  it('itens de pacotes atrasados ficam em risco de deslocamento', () => {
    const r = cashflow([item({ code: 'ORC-009', plannedDate: '2026-02-10', workPackageId: 'A' })], new Set(['A']));
    expect(r.atRisk).toEqual(['ORC-009']);
  });
});

describe('contingency', () => {
  it('consumo acima da reserva e cobertura dos riscos', () => {
    const r = contingency([item({ category: 'Contingência', budgeted: 50_000, actual: 60_000 })], 70_000);
    expect(r).toMatchObject({ reserve: 50_000, consumed: 60_000, balance: -10_000, consumedPct: 120, coversRisks: false });
    expect(contingency([], 0).consumedPct).toBeNull();
  });
});

describe('financesRag', () => {
  const settings = { cpiGreenMin: 0.95, cpiYellowMin: 0.85 };
  const evm = (cpi: number | null) => ({ ...computeEvm([], {}, '2026-01-01'), cpi });
  const summary = (budgeted: number, committed: number) => ({ ...moneySummary([item({ budgeted })]), total: { budgeted, committed, actual: 0 } });
  const cont = contingency([], 0);
  it('faixas de CPI, comprometido e contingência', () => {
    expect(financesRag(evm(0.97), summary(100, 50), cont, settings).rag).toBe('verde');
    expect(financesRag(evm(0.9), summary(100, 50), cont, settings).rag).toBe('amarelo');
    const over = financesRag(evm(1), summary(100, 150), cont, settings);
    expect(over).toEqual({ rag: 'amarelo', reason: 'comprometido acima do orçado' });
    expect(financesRag(evm(0.8), summary(100, 50), cont, settings).rag).toBe('vermelho');
    const spent = contingency([item({ category: 'Contingência', budgeted: 100, actual: 120 })], 0);
    expect(financesRag(evm(1), summary(100, 50), spent, settings).rag).toBe('vermelho');
  });
  it('sem itens de custo = n/a', () => {
    expect(financesRag(evm(null), moneySummary([]), cont, settings).rag).toBe('n/a');
  });
});
