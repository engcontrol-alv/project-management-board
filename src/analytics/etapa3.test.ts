import { describe, expect, it } from 'vitest';
import { aBudgetLine, aMilestone, aPhysical } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import type { GovernanceProfile } from '@/modules/governance';
import type { ProjectSnapshot } from '@/project/snapshot';
import { snapshotBaseline } from './baseline-snapshot';
import { buildContext, computeDashboard } from './dashboard';
import { deriveProject } from './derive';

const STATUS = '2026-01-09';
const alertsOf = (s: ReturnType<ReturnType<typeof aSnapshot>['build']>) =>
  computeDashboard(buildContext(s, STATUS)).alerts.filter((a) => a.id.startsWith('deliverable-acceptance'));

describe('alerta: entregue sem teste de aceitação (D4)', () => {
  it('aceito com TAC reprovado = vermelho; concluído com TAF pendente = amarelo', () => {
    const s = aSnapshot()
      .withDeliverable(
        aPhysical({ code: 'ENT-009', status: 'Aceito pelo cliente', fatStatus: 'Aprovado', fatDate: '2026-01-02', satStatus: 'Reprovado', satDate: '2026-01-05' }),
        aPhysical({ id: 'd3' as never, code: 'ENT-010', status: 'Concluído', fatStatus: 'Pendente', satStatus: 'Pendente' }),
      )
      .build();
    expect(alertsOf(s).map((a) => [a.severity, a.message])).toEqual([
      ['vermelho', 'ENT-009 aceito pelo cliente com TAC/SAT Reprovado'],
      ['amarelo', 'ENT-010 concluído com TAF/FAT Pendente'],
    ]);
    expect(alertsOf(s)[0]?.action).toEqual({ kind: 'openRecord', module: 'scope', collection: 'deliverables', id: 'd2' });
  });

  it('não aplicável e TAC pendente em entregável concluído não alertam', () => {
    const s = aSnapshot()
      .withDeliverable(
        aPhysical({ status: 'Aceito pelo cliente' }),
        aPhysical({ id: 'd3' as never, code: 'ENT-010', status: 'Concluído', fatStatus: 'Aprovado', fatDate: '2026-01-02', satStatus: 'Pendente' }),
      )
      .build();
    expect(alertsOf(s)).toEqual([]);
  });

  it('Escopo desligado: a regra não roda', () => {
    const s = aSnapshot()
      .withModule('scope', { enabled: false })
      .withDeliverable(aPhysical({ status: 'Aceito pelo cliente', fatStatus: 'Pendente', satStatus: 'Pendente' }))
      .build();
    expect(alertsOf(s)).toEqual([]);
  });
});

describe('provisão de multa por atraso (D6, D7)', () => {
  const clause = (o: Partial<GovernanceProfile['latePenalty']> = {}) => (p: GovernanceProfile): GovernanceProfile => ({
    ...p,
    latePenalty: { ...p.latePenalty, enabled: true, ratePct: 0.1, period: 'Diário', base: 'Valor do contrato', contractValueCents: 150_000_000, capPct: 10, ...o },
  });
  const penalty = (s: ProjectSnapshot) => deriveProject(s, STATUS).penalty;
  const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
    ...s,
    baselines: [snapshotBaseline(s, deriveProject(s, '2026-01-05'), { id: 'lb1', now: 'now', changeRequestId: null })],
  });

  it('só marcos contratuais; sem LB, prazo = data manual; atraso até a data de status', () => {
    const s = aSnapshot()
      .withProfile(clause())
      .withMilestone(
        aMilestone({ manualDate: '2026-01-05' }),
        aMilestone({ id: 'm2' as never, code: 'M-002', type: 'Faturamento', manualDate: '2026-01-01' }),
        aMilestone({ id: 'm3' as never, code: 'M-003', manualDate: '2026-02-01' }),
      )
      .build();
    const p = penalty(s)!;
    expect(p.items).toEqual([
      { milestoneId: 'm1', code: 'M-001', name: 'Marco teste', dueDate: '2026-01-05', endDate: '2026-01-09', delayDays: 4, periods: 4, baseCents: 150_000_000, penaltyCents: 600_000 },
    ]);
    expect(p.totalCents).toBe(600_000);
  });

  it('prazo pela LB vigente; previsão depois da data de status entra como atraso previsto', () => {
    let s = withLb(aSnapshot().withProfile(clause()).withMilestone(aMilestone({ manualDate: '2026-01-05' })).build());
    s = { ...s, schedule: { milestones: { m1: { ...s.schedule.milestones['m1' as never]!, manualDate: '2026-01-12' } } as never } };
    expect(penalty(s)!.items[0]).toMatchObject({ dueDate: '2026-01-05', endDate: '2026-01-12', delayDays: 7 });
  });

  it('concluído com atraso conta até a data real; no prazo não gera multa', () => {
    const s = aSnapshot()
      .withProfile(clause())
      .withMilestone(
        aMilestone({ manualDate: '2026-01-05', actualDate: '2026-01-07' }),
        aMilestone({ id: 'm2' as never, code: 'M-002', manualDate: '2026-01-05', actualDate: '2026-01-05' }),
      )
      .build();
    expect(penalty(s)!.items.map((i) => [i.code, i.delayDays, i.penaltyCents])).toEqual([['M-001', 2, 300_000]]);
  });

  it('base "Valor do marco" = receitas vinculadas; com Finanças desligado = n/a', () => {
    const b = aSnapshot()
      .withProfile(clause({ base: 'Valor do marco', ratePct: 1, capPct: null, contractValueCents: null }))
      .withMilestone(aMilestone({ manualDate: '2026-01-05' }))
      .withBudgetLine(
        aBudgetLine({ kind: 'Receita', category: 'Marco contratual/Faturamento', milestoneId: 'm1' as never, budgetedCents: 10_000_000 }),
        aBudgetLine({ id: 'orc2' as never, code: 'ORC-002', kind: 'Receita', category: 'Marco contratual/Faturamento', milestoneId: 'm1' as never, budgetedCents: 5_000_000, status: 'Cancelado' }),
      );
    expect(penalty(b.build())!.items[0]).toMatchObject({ baseCents: 10_000_000, penaltyCents: 400_000 });
    const off = penalty(b.withModule('finances', { enabled: false }).build())!;
    expect(off.totalCents).toBeNull();
    expect(off.reason).toBe('Finanças desligado: sem o valor do marco');
  });

  it('cláusula desativada ou Cronograma desligado = sem provisão', () => {
    const late = aMilestone({ manualDate: '2026-01-05' });
    expect(penalty(aSnapshot().withMilestone(late).build())).toBeNull();
    expect(penalty(aSnapshot().withProfile(clause()).withModule('schedule', { enabled: false }).withMilestone(late).build())).toBeNull();
  });

  it('nunca grava nada: só projeção', () => {
    const s = aSnapshot().withProfile(clause()).withMilestone(aMilestone({ manualDate: '2026-01-05' })).build();
    const before = structuredClone(s);
    penalty(s);
    expect(s).toEqual(before);
  });
});
