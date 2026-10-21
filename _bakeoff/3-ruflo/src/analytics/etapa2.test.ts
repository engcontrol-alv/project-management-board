import { describe, expect, it } from 'vitest';
import {
  aBudgetLine,
  anAllocation,
  aPackage,
  aProcurement,
  aResource,
  aRisk,
  aSupplier,
  aMilestone,
} from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import type { ProjectSnapshot } from '@/project/snapshot';
import { snapshotBaseline } from './baseline-snapshot';
import { deriveProject } from './derive';
import { supplierPanel } from './supplier-panel';

const STATUS = '2026-01-09';
const withLb = (s: ProjectSnapshot): ProjectSnapshot => {
  const lb = snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb1', now: 'now', changeRequestId: null });
  return { ...s, baselines: [lb] };
};

/** A (10 dias, 40%) com contratação em USD e linha de custo; B (5 dias) depois de A; marco após B. */
const base = () =>
  aSnapshot()
    .withParty(aSupplier())
    .withPackage(
      aPackage({ id: 'A', code: '1', duration: 10, percentComplete: 0 }),
      aPackage({ id: 'B', code: '2', duration: 5, predecessorIds: ['A' as never] }),
    )
    .withMilestone(aMilestone({ id: 'M' as never, predecessorIds: ['B' as never], manualDate: null }))
    .withProcurement(
      aProcurement({ workPackageId: 'A' as never, currency: 'USD', rate: 5, budgetedCents: 1_000_000, milestoneId: 'M' as never }),
    )
    .withBudgetLine(aBudgetLine({ workPackageId: 'A' as never, budgetedCents: 5_000_000 }))
    .build();

const progress = (s: ProjectSnapshot, pct: number, actualCents: number): ProjectSnapshot => {
  const a = { ...s.scope.wbs['A' as never]!, actualStart: PROJECT_START, percentComplete: pct };
  const line = Object.values(s.finances.budgetLines)[0]!;
  return {
    ...s,
    scope: { ...s.scope, wbs: { ...s.scope.wbs, [a.id]: a } },
    finances: {
      ...s.finances,
      budgetLines: { [line.id]: { ...line, actualCents, status: 'Em andamento' as const } } as ProjectSnapshot['finances']['budgetLines'],
    },
  };
};

describe('deriveFinances', () => {
  it('converte USD pela taxa do item e calcula o EVM pela LB', () => {
    const s = progress(withLb(base()), 40, 5_000_000);
    const f = deriveProject(s, STATUS).finances!;
    expect(f.evm.bac).toBe(10_000_000);
    expect(f.evm.pv).toBe(5_000_000);
    expect(f.evm.ev).toBe(4_000_000);
    expect(f.evm.cpi).toBeCloseTo(0.8);
    expect(f.summary.total.budgeted).toBe(10_000_000);
  });

  it('PV e BAC usam o orçado da LB mesmo que o plano mude depois', () => {
    const s = withLb(base());
    const line = Object.values(s.finances.budgetLines)[0]!;
    const changed = { ...s, finances: { ...s.finances, budgetLines: { [line.id]: { ...line, budgetedCents: 9_000_000 } } } } as ProjectSnapshot;
    const f = deriveProject(changed, STATUS).finances!;
    expect(f.evm.bac).toBe(10_000_000);
    expect(f.summary.total.budgeted).toBe(14_000_000);
  });

  it('item criado depois da LB fica fora do PV, mas entra no total', () => {
    const s = withLb(base());
    const extra = aBudgetLine({ id: 'late' as never, code: 'ORC-002', workPackageId: 'A' as never, budgetedCents: 1_000_000 });
    const after = { ...s, finances: { ...s.finances, budgetLines: { ...s.finances.budgetLines, late: extra } } } as ProjectSnapshot;
    const f = deriveProject(after, STATUS).finances!;
    expect(f.evm.pv).toBe(5_000_000);
    expect(f.evm.bac).toBe(11_000_000);
    expect(f.summary.total.budgeted).toBe(11_000_000);
  });

  it('sem LB: BAC atual, PV e SPI n/a; Finanças desligado = null', () => {
    const f = deriveProject(base(), STATUS).finances!;
    expect(f.evm.bac).toBe(10_000_000);
    expect(f.evm.pv).toBeNull();
    expect(f.evm.spi).toBeNull();
    expect(f.moneySCurve).toEqual([]);
    const off = aSnapshot().withModule('finances', { enabled: false }).build();
    expect(deriveProject(off, STATUS).finances).toBeNull();
  });

  it('Review Focus 3: atrasar o pacote não altera dados nem totais de Finanças', () => {
    const s = withLb(base());
    const before = deriveProject(s, STATUS).finances!;
    const a = s.scope.wbs['A' as never]!;
    const late = { ...s, scope: { ...s.scope, wbs: { ...s.scope.wbs, [a.id]: { ...a, duration: 20 } } } };
    const after = deriveProject(late, STATUS).finances!;
    expect(late.finances).toEqual(s.finances);
    expect(after.summary).toEqual(before.summary);
    expect(after.evm.bac).toBe(before.evm.bac);
    expect(after.cashflow.atRisk).toEqual([]);
  });

  it('curva S monetária: PV acumulado da LB, AC real e EV até a data de status', () => {
    const s = progress(withLb(base()), 40, 5_000_000);
    const line = Object.values(s.finances.budgetLines)[0]!;
    const paid = { ...s, finances: { ...s.finances, budgetLines: { [line.id]: { ...line, actualDate: '2026-01-07' } } } } as ProjectSnapshot;
    const curve = deriveProject(paid, STATUS).finances!.moneySCurve;
    const last = curve[curve.length - 1]!;
    expect(last.pv).toBe(10_000_000);
    expect(last.ev).toBeNull();
    const now = curve.find((p) => p.date === STATUS)!;
    expect(now).toEqual({ date: STATUS, pv: 5_000_000, ev: 4_000_000, ac: 5_000_000 });
  });
});

describe('linha de base de custos', () => {
  it('fotografa linhas de custo e contratações não canceladas', () => {
    const s = aSnapshot()
      .withParty(aSupplier())
      .withProcurement(aProcurement({ currency: 'USD', rate: 5 }), aProcurement({ id: 'x' as never, code: 'CTR-002', contractStatus: 'Cancelado' }))
      .withBudgetLine(aBudgetLine(), aBudgetLine({ id: 'rev' as never, code: 'ORC-002', kind: 'Receita' }))
      .build();
    const lb = snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'now', changeRequestId: null });
    expect(lb.costItems).toEqual({
      ctr1: { budgetedCents: 1_000_000, currency: 'USD', rate: 5 },
      orc1: { budgetedCents: 100_000, currency: 'BRL', rate: 1 },
    });
  });
});

describe('painel do fornecedor, riscos e carga', () => {
  it('totais, atrasos e riscos do fornecedor', () => {
    const s = aSnapshot()
      .withParty(aSupplier())
      .withProcurement(
        aProcurement({ committedCents: 2_000_000, contractStatus: 'Contratado', budgetedCents: 1_500_000, dueDate: '2026-01-07' }),
        aProcurement({ id: 'c2' as never, code: 'CTR-002', budgetedCents: 500_000 }),
      )
      .withRisk(aRisk({ procurementIds: ['ctr1' as never] }))
      .build();
    const panel = supplierPanel(s, deriveProject(s, STATUS), 'sup1');
    expect(panel.totals).toEqual({ budgeted: 2_000_000, committed: 2_000_000, actual: 0 });
    expect(panel.procurements.map((p) => [p.code, p.late])).toEqual([['CTR-001', true], ['CTR-002', false]]);
    expect(panel.risks).toEqual(['r1']);
    expect(panel.highlighted).toBe(false);
  });

  it('riscos: matriz, exposição por categoria e valor esperado aberto', () => {
    const s = aSnapshot()
      .withRisk(
        aRisk({ probability: 3, impact: 3, probabilityPct: 50, costImpactCents: 200_000 }),
        aRisk({ id: 'r2' as never, code: 'R-002', probability: null, category: 'Técnico' }),
        aRisk({ id: 'r3' as never, code: 'R-003', status: 'Encerrado', probabilityPct: 90, costImpactCents: 1_000_000 }),
      )
      .build();
    const r = deriveProject(s, STATUS).risks!;
    expect(r.matrix.cells['3-3']).toEqual(['r1']);
    expect(r.matrix.unassessed).toEqual(['r2']);
    expect(r.openEmv).toBe(100_000);
    expect(r.byCategory.find((c) => c.category === 'Fornecedor/Aquisição')).toMatchObject({ count: 1, score: 9, emv: 100_000 });
  });

  it('recursos: carga semanal e pico', () => {
    const s = aSnapshot()
      .withResource(aResource())
      .withAllocation(anAllocation({ pct: 60 }), anAllocation({ id: 'a2' as never, code: 'ALO-002', pct: 60 }))
      .build();
    const r = deriveProject(s, STATUS).resources!;
    expect(r.peakPct).toBe(120);
    expect(r.overallocated).toEqual(['rec1']);
    expect(r.load[0]!.weeks[0]).toMatchObject({ week: '2026-01-05', demandPct: 120 });
  });
});
