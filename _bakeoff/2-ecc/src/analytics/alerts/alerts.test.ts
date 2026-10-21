import { ALERT_RULES } from './index';
import { computeDashboard } from '../dashboard';
import { analysisContext } from '../context';
import { snapshotBaseline } from '../baseline-snapshot';
import { deriveProject } from '../derive';
import { setModuleEnabled } from '@/project/config';
import { aSnapshot, changeRequest, docDeliverable, milestone, NOW, pkg, START } from '@/test/builders';
import type { ProjectSnapshot } from '@/project/snapshot';

const run = (id: string, s: ProjectSnapshot, statusDate = START) =>
  ALERT_RULES.find((r) => r.id === id)!.evaluate(analysisContext(s, statusDate));

function withBaseline(s: ProjectSnapshot): ProjectSnapshot {
  s.baselines.push(snapshotBaseline(s, deriveProject(s, START), { id: 'b1', now: NOW, changeRequestId: null }));
  return s;
}

describe('milestone-deviation', () => {
  it('marco previsto após a LB', () => {
    const s = withBaseline(aSnapshot().wbs(pkg('A', 5)).milestones(milestone('M', ['A'], { code: 'M-004' })).build());
    expect(run('milestone-deviation', s)).toEqual([]);
    s.scope.wbs['A' as never] = pkg('A', 17);
    expect(run('milestone-deviation', s)).toEqual([
      {
        id: 'milestone-deviation:M',
        severity: 'vermelho',
        message: 'Marco M-004 previsto 12 dias após a linha de base — considerar solicitação de mudança',
        action: { kind: 'openChangeRequest' },
      },
    ]);
    s.scope.wbs['A' as never] = pkg('A', 7);
    expect(run('milestone-deviation', s)[0]?.severity).toBe('amarelo');
  });
});

describe('stale-change-request', () => {
  it('mudança aguardando decisão além do prazo', () => {
    const s = aSnapshot().changeRequests(changeRequest('C', { code: 'MUD-002', requestDate: '2026-01-01' })).build();
    expect(run('stale-change-request', s, '2026-01-16')).toEqual([]);
    expect(run('stale-change-request', s, '2026-01-19')).toEqual([
      {
        id: 'stale-change-request:C',
        severity: 'amarelo',
        message: 'Mudança MUD-002 aguardando decisão há 18 dias',
        action: { kind: 'openRecord', module: 'scope', collection: 'changeRequests', id: 'C' },
      },
    ]);
  });
});

describe('deliverable-overdue', () => {
  it('documentação vencida sem aprovação', () => {
    const s = aSnapshot()
      .deliverables(
        docDeliverable('D1', { code: 'ENT-010', plannedDate: '2026-01-04' }),
        docDeliverable('D2', { plannedDate: '2026-01-04', status: 'Aprovado' }),
        docDeliverable('D3', { plannedDate: '2026-01-04', actualDate: '2026-01-04' }),
        docDeliverable('D4', { plannedDate: '2026-01-05' }),
      )
      .build();
    expect(run('deliverable-overdue', s).map((a) => a.message)).toEqual(['ENT-010 vencido sem aprovação']);
  });
});

describe('baseline-package-deleted', () => {
  it('um alerta por pacote da LB excluído', () => {
    const s = withBaseline(aSnapshot().wbs(pkg('A', 5), pkg('B', 2)).build());
    expect(run('baseline-package-deleted', s)).toEqual([]);
    delete s.scope.wbs['A' as never];
    expect(run('baseline-package-deleted', s).map((a) => a.message)).toEqual([
      'Pacote da linha de base excluído sem mudança',
    ]);
  });
});

describe('requires', () => {
  it('regra que depende de módulo desligado não roda no painel', () => {
    const s = aSnapshot().changeRequests(changeRequest('C', { requestDate: '2025-01-01' })).build();
    expect(computeDashboard(analysisContext(s, START)).alerts).toHaveLength(1);
    s.project = { ...s.project, config: setModuleEnabled(s.project.config, 'scope', false) };
    expect(computeDashboard(analysisContext(s, START)).alerts).toHaveLength(0);
  });
});
