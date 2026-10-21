import { runCommand, type Command } from './run';
import { removeEntity, upsertEntity } from './entities';
import { transitionChangeRequest } from './change-requests';
import { applyChangeToBaseline, defineInitialBaseline } from './baseline';
import { newProjectSnapshot, reopenProject, saveCharter, setModuleEnabledCmd, setStatusDate, updateModuleSettings, updateProjectInfo } from './project';
import { currentBaseline } from '@/analytics/derive';
import { resolveConfig } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { aSnapshot, changeRequest, group, meeting, person, pkg, requirement, testCtx } from '@/test/builders';

function exec(s: ProjectSnapshot, cmd: Command, today?: string) {
  return runCommand(s, cmd, testCtx(today));
}
function must(s: ProjectSnapshot, cmd: Command, today?: string): ProjectSnapshot {
  const r = exec(s, cmd, today);
  if (!r.ok) throw new Error(r.error.join('\n'));
  return r.value.snapshot;
}
function errors(s: ProjectSnapshot, cmd: Command, today?: string): string[] {
  const r = exec(s, cmd, today);
  if (r.ok) throw new Error('esperava erro');
  return r.error;
}
const newCr = (title: string) => ({ ...changeRequest(''), code: '', title });

describe('códigos', () => {
  it('sequenciais e nunca reutilizados', () => {
    let s = aSnapshot().build();
    for (const t of ['a', 'b', 'c']) s = must(s, upsertEntity('scope', 'changeRequests', newCr(t)));
    const codes = () => Object.values(s.scope.changeRequests).map((c) => c.code).sort();
    expect(codes()).toEqual(['MUD-001', 'MUD-002', 'MUD-003']);
    const third = Object.values(s.scope.changeRequests).find((c) => c.code === 'MUD-003')!;
    s = must(s, removeEntity('scope', 'changeRequests', third.id));
    s = must(s, upsertEntity('scope', 'changeRequests', newCr('d')));
    expect(codes()).toEqual(['MUD-001', 'MUD-002', 'MUD-004']);
    expect(s.project.counters.MUD).toBe(4);
  });
  it('EAP recebe código hierárquico', () => {
    let s = aSnapshot().wbs(group('G', { code: '1' })).build();
    s = must(s, upsertEntity('scope', 'wbs', { ...pkg('', 2), code: '', parentId: 'G' }));
    s = must(s, upsertEntity('scope', 'wbs', { ...pkg('', 2), code: '', parentId: 'G' }));
    s = must(s, upsertEntity('scope', 'wbs', { ...group(''), code: '' }));
    expect(Object.values(s.scope.wbs).map((n) => n.code).sort()).toEqual(['1', '1.1', '1.2', '2']);
  });
  it('edição mantém id e código', () => {
    let s = must(aSnapshot().build(), upsertEntity('scope', 'changeRequests', newCr('a')));
    const cr = Object.values(s.scope.changeRequests)[0]!;
    s = must(s, upsertEntity('scope', 'changeRequests', { ...cr, title: 'novo' }));
    expect(Object.values(s.scope.changeRequests)).toEqual([{ ...cr, title: 'novo' }]);
  });
});

describe('validação', () => {
  it('vínculo inexistente é recusado', () => {
    const s = aSnapshot().build();
    expect(
      errors(s, upsertEntity('scope', 'requirements', { ...requirement(''), code: '', ownerId: 'x' })).join(),
    ).toMatch(/inexistente/);
  });
  it('ciclo na EAP é recusado', () => {
    const s = aSnapshot().wbs(pkg('A', 1, ['B']), pkg('B', 1)).build();
    expect(errors(s, upsertEntity('scope', 'wbs', pkg('B', 1, ['A']))).join()).toMatch(/dependência circular/);
  });
  it('schema inválido é recusado', () => {
    expect(errors(aSnapshot().build(), upsertEntity('scope', 'wbs', { ...pkg('', -1), code: '' })).length).toBe(1);
  });
  it('reunião realizada com data futura', () => {
    const r = errors(aSnapshot().build(), upsertEntity('governance', 'meetings', { ...meeting(''), code: '', status: 'Realizada', date: '2026-01-06' }), '2026-01-05');
    expect(r).toEqual(['Reunião realizada não pode ter data futura.']);
  });
  it('coleção desconhecida', () => {
    expect(errors(aSnapshot().build(), upsertEntity('scope', 'nada', { id: 'x' }))).toEqual(['Coleção desconhecida: scope.nada']);
  });
});

describe('exclusão', () => {
  it('bloqueada quando referenciado', () => {
    const s = aSnapshot()
      .parties(person('P', { code: 'PI-001', name: 'Ana' }))
      .with((s) => (s.governance.profile.charter.managerId = 'P' as never))
      .build();
    expect(errors(s, removeEntity('stakeholders', 'parties', 'P'))).toEqual([
      'Não é possível excluir: usado em Ficha do projeto',
    ]);
  });
});

describe('mudanças', () => {
  const decision = { approverId: 'P', decisionDate: '2026-01-06' } as never;
  const withCr = (status: string) =>
    aSnapshot()
      .parties(person('P'))
      .changeRequests(changeRequest('C', status === 'Aprovada' ? { status, approverId: 'P', decisionDate: '2026-01-06' } as never : { status } as never))
      .build();
  it('transições', () => {
    expect(errors(withCr('Solicitada'), transitionChangeRequest('C', 'Aprovada'))).toEqual([
      'Transição de "Solicitada" para "Aprovada" não permitida.',
    ]);
    expect(exec(withCr('Em análise'), transitionChangeRequest('C', 'Aprovada')).ok).toBe(false);
    const approved = must(withCr('Em análise'), transitionChangeRequest('C', 'Aprovada', decision));
    expect(approved.scope.changeRequests['C' as never]).toMatchObject({ status: 'Aprovada', approverId: 'P' });
    expect(must(withCr('Aprovada'), transitionChangeRequest('C', 'Implementada')).scope.changeRequests['C' as never]?.status).toBe(
      'Implementada',
    );
    const withLb = must(withCr('Aprovada'), defineInitialBaseline());
    expect(errors(withLb, transitionChangeRequest('C', 'Implementada'))).toEqual(['Use "Aplicar à linha de base".']);
  });
});

describe('linha de base', () => {
  const plan = () =>
    aSnapshot()
      .parties(person('P'))
      .wbs(pkg('A', 5))
      .changeRequests(changeRequest('C', { status: 'Aprovada', approverId: 'P' as never, decisionDate: '2026-01-06' }), changeRequest('S'))
      .build();
  it('definir uma única vez', () => {
    const s = must(plan(), defineInitialBaseline());
    expect(s.baselines).toHaveLength(1);
    expect(errors(s, defineInitialBaseline())).toEqual(['Linha de base já definida']);
  });
  it('ciclo impede definir', () => {
    const s = aSnapshot().wbs(pkg('A', 1, ['B']), pkg('B', 1, ['A'])).build();
    expect(errors(s, defineInitialBaseline())).toEqual(['A EAP tem dependência circular']);
  });
  it('aplicar mudança aprovada cria v2 e implementa a mudança', () => {
    const v1 = must(plan(), defineInitialBaseline());
    expect(errors(v1, applyChangeToBaseline('S'))).toEqual(['Apenas mudanças aprovadas podem ser aplicadas à linha de base.']);
    expect(errors(plan(), applyChangeToBaseline('C'))).toEqual(['Defina a linha de base inicial antes.']);
    const edited = must(v1, upsertEntity('scope', 'wbs', pkg('A', 8)));
    expect(currentBaseline(edited)?.workPackages.A).toEqual({ start: '2026-01-05', finish: '2026-01-09', duration: 5 });
    const v2 = must(edited, applyChangeToBaseline('C'));
    expect(v2.baselines).toHaveLength(2);
    expect(v2.baselines[1]).toMatchObject({ version: 2, changeRequestId: 'C' });
    expect(v2.baselines[1]!.workPackages.A).toEqual({ start: '2026-01-05', finish: '2026-01-12', duration: 8 });
    expect(v2.baselines[0]).toEqual(v1.baselines[0]);
    expect(v2.scope.changeRequests['C' as never]?.status).toBe('Implementada');
  });
});

describe('projeto', () => {
  it('novo projeto com ficha e config padrão', () => {
    const r = newProjectSnapshot({ name: 'Obra', code: 'OB-1', startDate: '2026-01-05' }, testCtx());
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.project.info.code).toBe('OB-1');
      expect(r.value.governance.profile.id).toBe(r.value.project.id);
      expect(resolveConfig(r.value.project.config).warnings).toEqual([]);
    }
    expect(newProjectSnapshot({ name: '', code: 'X'.repeat(13), startDate: 'x' }, testCtx()).ok).toBe(false);
  });
  it('info, data de status, módulos e parâmetros', () => {
    let s = aSnapshot().build();
    s = must(s, updateProjectInfo({ name: 'Novo', code: 'N1', startDate: '2026-02-01' }));
    expect(s.project.info.name).toBe('Novo');
    s = must(s, setStatusDate('2026-03-01'));
    expect(s.project.statusDate).toBe('2026-03-01');
    s = must(s, setModuleEnabledCmd('scope', false));
    expect(resolveConfig(s.project.config).enabled.schedule).toBe(false);
    s = must(s, updateModuleSettings('schedule', { ...resolveConfig(s.project.config).settings.schedule, milestoneToleranceDays: 3 }));
    expect(resolveConfig(s.project.config).settings.schedule.milestoneToleranceDays).toBe(3);
    expect(errors(s, updateModuleSettings('schedule', { milestoneToleranceDays: -1 })).length).toBeGreaterThan(0);
    expect(errors(s, updateProjectInfo({ name: 'x', code: 'x', startDate: 'nada' })).length).toBeGreaterThan(0);
  });
});

describe('projeto encerrado', () => {
  it('somente leitura até reabrir', () => {
    const s = aSnapshot()
      .with((s) => {
        s.governance.profile.charter.status = 'Encerrado';
        s.governance.profile.closure = { plannedDate: null, actualDate: '2026-01-05', pendingItems: '', closureTermSigned: true };
      })
      .build();
    expect(errors(s, upsertEntity('scope', 'wbs', pkg('A', 1)))).toEqual(['Projeto encerrado: somente leitura.']);
    expect(errors(s, defineInitialBaseline())).toEqual(['Projeto encerrado: somente leitura.']);
    const reopened = must(s, reopenProject());
    expect(reopened.governance.profile.charter.status).toBe('Em execução');
  });
});

describe('saveCharter', () => {
  it('grava info do projeto e ficha numa única gravação', () => {
    const s = aSnapshot().parties(person('P')).build();
    const profile = { ...s.governance.profile, charter: { ...s.governance.profile.charter, managerId: 'P' as never } };
    const next = must(s, saveCharter({ name: 'Novo nome', code: 'NN', startDate: '2026-01-05' }, profile));
    expect(next.project.info.name).toBe('Novo nome');
    expect(next.governance.profile.charter.managerId).toBe('P');
    const bad = { ...profile, charter: { ...profile.charter, status: 'Encerrado' as const } };
    expect(errors(s, saveCharter(s.project.info, bad)).join()).toMatch(/termo de encerramento/);
  });
});
