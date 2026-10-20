import { describe, expect, it } from 'vitest';
import {
  aBudgetLine,
  aCommunication,
  anAllocation,
  anAnalysis,
  aMilestone,
  aPackage,
  aProcurement,
  aResource,
  aRisk,
  aSupplier,
} from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import type { ProjectSnapshot } from '@/project/snapshot';
import { ALERT_RULES } from './alerts';
import { snapshotBaseline } from './baseline-snapshot';
import { buildContext, computeDashboard } from './dashboard';
import { deriveProject } from './derive';
import { INDICATORS } from './indicators/registry';

const STATUS = '2026-01-09';
const messages = (s: ProjectSnapshot) => computeDashboard(buildContext(s, STATUS)).alerts.map((a) => a.message);
const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'now', changeRequestId: null })],
});

describe('alertas da etapa 2', () => {
  const plan = () =>
    aSnapshot()
      .withParty(aSupplier())
      .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
      .withMilestone(aMilestone({ id: 'M' as never, predecessorIds: ['A' as never], manualDate: null }));

  it('entrega da contratação depois do marco que depende dela', () => {
    const late = plan().withProcurement(aProcurement({ milestoneId: 'M' as never, dueDate: '2026-01-20', criticality: 'Alta' })).build();
    expect(messages(late)).toContain('Entrega de CTR-001 ameaça o marco M-001');
    const ok = plan().withProcurement(aProcurement({ milestoneId: 'M' as never, dueDate: '2026-01-08' })).build();
    expect(messages(ok)).not.toContain('Entrega de CTR-001 ameaça o marco M-001');
  });

  it('comprometido acima do orçado', () => {
    const over = plan().withProcurement(aProcurement({ budgetedCents: 100, committedCents: 200, contractStatus: 'Contratado' })).build();
    expect(messages(over)).toContain('CTR-001 comprometido acima do orçado');
    expect(messages(plan().withProcurement(aProcurement()).build())).not.toContain('CTR-001 comprometido acima do orçado');
  });

  it('reserva de contingência insuficiente — só com Finanças e Riscos ligados', () => {
    const s = () =>
      plan()
        .withBudgetLine(aBudgetLine({ category: 'Contingência', budgetedCents: 10_000 }))
        .withRisk(aRisk({ probabilityPct: 50, costImpactCents: 100_000 }));
    expect(messages(s().build())).toContain('Reserva de contingência insuficiente');
    expect(messages(s().withModule('risks', { enabled: false }).build())).not.toContain('Reserva de contingência insuficiente');
    expect(messages(s().withModule('finances', { enabled: false }).build())).not.toContain('Reserva de contingência insuficiente');
  });

  it('fornecedor crítico desengajado e fornecedor destacado sem acompanhamento', () => {
    const opp = aSupplier({ analysis: anAnalysis({ power: 'Alto', interest: 'Alto', currentPosture: 'Opositor' }) });
    const s = aSnapshot().withParty(opp).withProcurement(aProcurement({ criticality: 'Alta' })).build();
    expect(messages(s)).toContain('Fornecedor crítico desengajado: PI-010 Fornecedor Teste');

    const big = aSupplier({ analysis: anAnalysis({ power: 'Baixo', interest: 'Baixo' }) });
    const heavy = aSnapshot()
      .withParty(big)
      .withProcurement(aProcurement({ budgetedCents: 20_000_000, committedCents: 20_000_000, contractStatus: 'Contratado' }))
      .build();
    expect(messages(heavy)).toContain('Fornecedor PI-010 com comprometido acima do limite sem acompanhamento');
    const followed = aSnapshot()
      .withParty(aSupplier({ analysis: anAnalysis() }))
      .withCommunication(aCommunication({ recipientIds: ['sup1' as never] }))
      .withProcurement(aProcurement({ budgetedCents: 20_000_000, committedCents: 20_000_000, contractStatus: 'Contratado' }))
      .build();
    expect(messages(followed)).not.toContain('Fornecedor PI-010 com comprometido acima do limite sem acompanhamento');
  });

  it('cada regra declara os módulos de que depende', () => {
    const ids = Object.fromEntries(ALERT_RULES.map((r) => [r.id, r.requires]));
    expect(ids['procurement-threatens-milestone']).toEqual(['finances', 'schedule']);
    expect(ids['contingency-insufficient']).toEqual(['finances', 'risks']);
    expect(ids['supplier-disengaged']).toEqual(['finances', 'stakeholders']);
  });
});

describe('indicadores da etapa 2', () => {
  it('Finanças: RAG pelo CPI e KPIs monetários', () => {
    const base = aSnapshot()
      .withParty(aSupplier())
      .withPackage(aPackage({ id: 'A', code: '1', duration: 10, actualStart: PROJECT_START, percentComplete: 40 }))
      .withBudgetLine(aBudgetLine({ workPackageId: 'A' as never, budgetedCents: 100_000, actualCents: 50_000, status: 'Em andamento' }))
      .build();
    const ind = INDICATORS.finances(buildContext(withLb(base), STATUS));
    expect(ind.rag).toBe('vermelho');
    expect(ind.ragReason).toBe('CPI 0,80 abaixo de 0,85');
    expect(ind.kpis.map((k) => k.label)).toEqual(['SPI', 'CPI', 'EAC', 'Orçado', 'Comprometido', 'Realizado']);
    expect(ind.kpis.find((k) => k.label === 'EAC')).toMatchObject({ value: 125_000, format: 'money' });
  });

  it('EAC n/a quando o CPI não pode ser calculado', () => {
    const s = aSnapshot().withBudgetLine(aBudgetLine()).build();
    expect(INDICATORS.finances(buildContext(s, STATUS)).kpis.find((k) => k.label === 'EAC')?.value).toBeNull();
  });

  it('Riscos e Recursos', () => {
    const s = aSnapshot()
      .withRisk(aRisk({ probability: 3, impact: 3 }), aRisk({ id: 'r2' as never, code: 'R-002', probability: 2, impact: 3 }))
      .withResource(aResource())
      .withAllocation(anAllocation({ pct: 70 }), anAllocation({ id: 'a2' as never, code: 'ALO-002', pct: 60 }))
      .build();
    const ctx = buildContext(s, STATUS);
    const risks = INDICATORS.risks(ctx);
    expect(risks.rag).toBe('vermelho');
    expect(risks.kpis.map((k) => [k.label, k.value])).toEqual([
      ['Riscos críticos abertos', 1],
      ['Riscos altos abertos', 1],
      ['Valor esperado dos riscos abertos', 0],
    ]);
    const res = INDICATORS.resources(ctx);
    expect(res.rag).toBe('vermelho');
    expect(res.kpis.map((k) => [k.label, k.value])).toEqual([['Recursos sobrealocados', 1], ['Pico de carga', 130]]);
  });

  it('Partes Interessadas: Gerenciar de perto com Opositor = vermelho; sem comunicação = amarelo', () => {
    const close = (o = {}) => aSupplier({ analysis: anAnalysis({ power: 'Alto', interest: 'Alto', ...o }) });
    const red = aSnapshot().withParty(close({ currentPosture: 'Opositor' })).build();
    expect(INDICATORS.stakeholders(buildContext(red, STATUS)).rag).toBe('vermelho');
    const yellow = aSnapshot().withParty(close()).build();
    expect(INDICATORS.stakeholders(buildContext(yellow, STATUS))).toMatchObject({
      rag: 'amarelo',
      ragReason: '1 parte(s) em "Gerenciar de perto" sem plano de comunicação',
    });
    const green = aSnapshot().withParty(close()).withCommunication(aCommunication({ recipientIds: ['sup1' as never] })).build();
    expect(INDICATORS.stakeholders(buildContext(green, STATUS)).rag).toBe('verde');
    expect(INDICATORS.stakeholders(buildContext(aSnapshot().build(), STATUS))).toMatchObject({
      rag: 'n/a',
      ragReason: 'Nenhuma parte interessada analisada',
    });
  });

  it('Review Focus 5: painel com os 7 módulos; desligar Finanças tira CPI/EAC e alertas financeiros', () => {
    const s = aSnapshot()
      .withParty(aSupplier())
      .withProcurement(aProcurement({ budgetedCents: 100, committedCents: 200, contractStatus: 'Contratado' }));
    const on = computeDashboard(buildContext(s.build(), STATUS));
    expect(on.perModule).toHaveLength(7);
    expect(on.kpis.some((k) => k.label === 'CPI')).toBe(true);
    const off = computeDashboard(buildContext(s.withModule('finances', { enabled: false }).build(), STATUS));
    expect(off.perModule.map((m) => m.id)).not.toContain('finances');
    expect(off.kpis.some((k) => k.label === 'CPI' || k.label === 'EAC')).toBe(false);
    expect(off.alerts.map((a) => a.message)).not.toContain('CTR-001 comprometido acima do orçado');
  });
});
