import { describe, expect, it } from 'vitest';
import { aChangeRequest, aDocument, aMilestone, aPackage, aRequirement } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { setModuleEnabled, defaultConfig } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { deriveProject } from './derive';
import { snapshotBaseline } from './baseline-snapshot';
import { buildContext, computeDashboard } from './dashboard';
import { ALERT_RULES } from './alerts';
import { INDICATORS } from './indicators/registry';

const M = aMilestone({ id: 'M' as never, code: 'M-001', predecessorIds: ['A' as never], manualDate: null });

function withBaseline(s: ProjectSnapshot, statusDate = PROJECT_START): ProjectSnapshot {
  const b = snapshotBaseline(s, deriveProject(s, statusDate), { id: 'b1', now: 'now', changeRequestId: null });
  return { ...s, baselines: [b] };
}

const planned = () => aSnapshot().withPackage(aPackage({ id: 'A', duration: 5 })).withMilestone(M).build();

function setDuration(s: ProjectSnapshot, id: string, duration: number): ProjectSnapshot {
  const n = s.scope.wbs[id as never]!;
  return { ...s, scope: { ...s.scope, wbs: { ...s.scope.wbs, [id]: { ...n, duration } } } };
}

describe('deriveProject', () => {
  it('sem LB: sem data de LB, SPI e Curva S', () => {
    const d = deriveProject(planned(), PROJECT_START);
    expect(d.milestones[M.id]?.baselineDate).toBeNull();
    expect(d.milestones[M.id]?.forecast).toBe('2026-01-09');
    expect(d.progress.spi).toBeNull();
    expect(d.sCurve).toEqual([]);
  });

  it('snapshotBaseline fotografa pacotes e marcos', () => {
    const s = planned();
    const b = snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'b1', now: 'now', changeRequestId: null });
    expect(b.version).toBe(1);
    expect(b.workPackages['A' as never]).toEqual({ start: '2026-01-05', finish: '2026-01-09', duration: 5 });
    expect(b.milestones[M.id]).toEqual({ date: '2026-01-09' });
    expect(b.projectFinish).toBe('2026-01-09');
  });

  it('desvio do marco em relação à LB', () => {
    const s = setDuration(withBaseline(planned()), 'A', 8);
    const m = deriveProject(s, PROJECT_START).milestones[M.id];
    expect(m).toEqual({
      forecast: '2026-01-12',
      baselineDate: '2026-01-09',
      deviationDays: 3,
      status: 'Atenção',
      critical: true,
    });
  });

  it('ciclo não lança e o marco fica sem previsão', () => {
    const s = aSnapshot()
      .withPackage(aPackage({ id: 'A', predecessorIds: ['B'] }), aPackage({ id: 'B', predecessorIds: ['A'] }))
      .withMilestone(M)
      .build();
    const d = deriveProject(s, PROJECT_START);
    expect(d.schedule.ok).toBe(false);
    expect(d.milestones[M.id]?.forecast).toBeNull();
  });

  it('Review Focus 4: status antes do início e sem pacotes não geram NaN', () => {
    const empty = deriveProject(aSnapshot().build(), '2025-12-01');
    expect(empty.progress).toEqual({ actual: null, planned: null, spi: null });
    const s = withBaseline(planned());
    const before = deriveProject(s, '2025-12-01');
    expect(before.progress.planned).toBe(0);
    expect(before.progress.spi).toBeNull();
  });
});

describe('alertas', () => {
  const ctx = (s: ProjectSnapshot, date = PROJECT_START) => buildContext(s, date);
  const rule = (id: string) => ALERT_RULES.find((r) => r.id === id)!;

  it('desvio de marco', () => {
    const s = setDuration(withBaseline(planned()), 'A', 12);
    expect(rule('milestone-deviation').evaluate(ctx(s))).toEqual([
      {
        id: `milestone-deviation:${M.id}`,
        severity: 'vermelho',
        message: 'Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança',
        action: { kind: 'openChangeRequest' },
      },
    ]);
    expect(rule('milestone-deviation').evaluate(ctx(withBaseline(planned())))).toEqual([]);
  });

  it('mudança parada', () => {
    const s = aSnapshot().withChangeRequest(aChangeRequest({ requestDate: '2026-01-01' })).build();
    expect(rule('stale-change-request').evaluate(ctx(s, '2026-01-19'))[0]?.message).toBe(
      'Mudança MUD-001 aguardando decisão há 18 dias',
    );
    expect(rule('stale-change-request').evaluate(ctx(s, '2026-01-10'))).toEqual([]);
  });

  it('entregável de documentação vencido', () => {
    const s = aSnapshot().withDeliverable(aDocument({ code: 'ENT-010', plannedDate: '2026-01-02' })).build();
    expect(rule('deliverable-overdue').evaluate(ctx(s))[0]?.message).toBe('ENT-010 vencido sem aprovação');
    const approved = aSnapshot()
      .withDeliverable(aDocument({ plannedDate: '2026-01-02', status: 'Aprovado' }))
      .build();
    expect(rule('deliverable-overdue').evaluate(ctx(approved))).toEqual([]);
  });

  it('pacote da LB excluído', () => {
    const s = withBaseline(aSnapshot().withPackage(aPackage({ id: 'A', duration: 5 })).build());
    expect(rule('baseline-package-deleted').evaluate(ctx(s))).toEqual([]);
    const deleted = { ...s, scope: { ...s.scope, wbs: {} } };
    expect(rule('baseline-package-deleted').evaluate(ctx(deleted))[0]?.message).toBe(
      'Pacote da linha de base excluído sem mudança',
    );
  });

  it('mudança parada não aparece com Escopo desligado', () => {
    const s = aSnapshot()
      .withChangeRequest(aChangeRequest({ requestDate: '2026-01-01' }))
      .withConfig(setModuleEnabled(defaultConfig(), 'scope', false))
      .build();
    expect(computeDashboard(ctx(s, '2026-03-01')).alerts).toEqual([]);
  });
});

describe('indicadores e painel', () => {
  it('requisito Alta com gap deixa Escopo vermelho', () => {
    const s = aSnapshot()
      .withRequirement(aRequirement({ priority: 'Alta', fulfillmentStatus: 'Não atendido (gap)' }))
      .build();
    const ind = INDICATORS.scope(buildContext(s, PROJECT_START));
    expect(ind.rag).toBe('vermelho');
    expect(ind.kpis.find((k) => k.id === 'scope.gaps')?.value).toBe(1);
  });

  it('atraso de pacote crítico: Cronograma vermelho e alerta', () => {
    const s = setDuration(withBaseline(planned()), 'A', 12);
    const c = buildContext(s, PROJECT_START);
    expect(INDICATORS.schedule(c).rag).toBe('vermelho');
    const dash = computeDashboard(c);
    expect(dash.alerts.map((a) => a.message)).toContain(
      'Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança',
    );
  });

  it('sem LB: SPI n/a e RAG vindo só dos marcos', () => {
    const ind = INDICATORS.schedule(buildContext(planned(), PROJECT_START));
    expect(ind.kpis.find((k) => k.id === 'schedule.spi')?.value).toBeNull();
    expect(ind.rag).toBe('verde');
  });

  it('painel: geral = pior; módulo desligado sai do cálculo e dos KPIs', () => {
    const base = setDuration(withBaseline(planned()), 'A', 12);
    const s = {
      ...base,
      scope: {
        ...base.scope,
        requirements: {
          r1: aRequirement({ validationStatus: 'Validado', lastValidation: '2026-01-01', fulfillmentStatus: 'Atendido' }),
        },
      },
    } as ProjectSnapshot;
    const dash = computeDashboard(buildContext(s, PROJECT_START));
    expect(dash.perModule.find((m) => m.id === 'scope')?.rag).toBe('verde');
    expect(dash.overall).toBe('vermelho');
    const off = { ...s, project: { ...s.project, config: setModuleEnabled(s.project.config, 'schedule', false) } };
    const dashOff = computeDashboard(buildContext(off, PROJECT_START));
    expect(dashOff.overall).toBe('verde');
    expect(dashOff.kpis.find((k) => k.id === 'schedule.spi')).toBeUndefined();
    expect(dashOff.perModule.map((m) => m.id)).not.toContain('schedule');
  });
});
