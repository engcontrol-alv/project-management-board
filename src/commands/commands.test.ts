import { describe, expect, it } from 'vitest';
import { aChangeRequest, aMeeting, aPackage, aPerson, aRequirement } from '@/test/factories';
import { aContext, aSnapshot } from '@/test/builders';
import { currentBaseline } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { runCommand, type Command } from './run';
import { removeEntity, upsertEntity } from './entities';
import { transitionChangeRequest } from './change-requests';
import { applyChangeToBaseline, defineInitialBaseline } from './baseline';
import { reopenProject, updateModuleSettings } from './project';

const ctx = aContext();

function run(s: ProjectSnapshot, cmd: Command) {
  return runCommand(s, cmd, ctx);
}
function apply(s: ProjectSnapshot, cmd: Command): ProjectSnapshot {
  const r = run(s, cmd);
  if (!r.ok) throw new Error(r.error.join('\n'));
  return r.value.snapshot;
}
function errors(s: ProjectSnapshot, cmd: Command): string[] {
  const r = run(s, cmd);
  return r.ok ? [] : r.error;
}

const newCr = (id: string) => aChangeRequest({ id: id as never, code: '' });
const decision = { approverId: 'p1' as never, decisionDate: '2026-01-10' };

describe('upsertEntity / removeEntity', () => {
  it('códigos sequenciais nunca reutilizados', () => {
    let s = aSnapshot().build();
    for (const id of ['a', 'b', 'c']) s = apply(s, upsertEntity('scope', 'changeRequests', newCr(id)));
    expect(Object.values(s.scope.changeRequests).map((c) => c.code).sort()).toEqual(['MUD-001', 'MUD-002', 'MUD-003']);
    s = apply(s, removeEntity('scope', 'changeRequests', 'c'));
    s = apply(s, upsertEntity('scope', 'changeRequests', newCr('d')));
    expect(s.scope.changeRequests['d' as never]?.code).toBe('MUD-004');
    expect(s.project.counters.MUD).toBe(4);
  });

  it('código da EAP pelo pai', () => {
    let s = aSnapshot().build();
    s = apply(s, upsertEntity('scope', 'wbs', { ...aPackage({ id: 'G', kind: 'Agrupador', duration: 0 }), code: '' }));
    s = apply(s, upsertEntity('scope', 'wbs', { ...aPackage({ id: 'A', parentId: 'G' }), code: '' }));
    s = apply(s, upsertEntity('scope', 'wbs', { ...aPackage({ id: 'B', parentId: 'G' }), code: '' }));
    expect([s.scope.wbs['G' as never]?.code, s.scope.wbs['A' as never]?.code, s.scope.wbs['B' as never]?.code]).toEqual(['1', '1.1', '1.2']);
  });

  it('vínculo inexistente e ciclo são recusados', () => {
    const s = aSnapshot()
      .withPackage(aPackage({ id: 'A', code: '1', predecessorIds: ['B'] }), aPackage({ id: 'B', code: '2' }))
      .build();
    expect(run(s, upsertEntity('scope', 'requirements', aRequirement({ ownerId: 'x' as never }))).ok).toBe(false);
    const cyc = errors(s, upsertEntity('scope', 'wbs', { ...s.scope.wbs['B' as never]!, predecessorIds: ['A' as never] }));
    expect(cyc.some((e) => e.includes('dependência circular'))).toBe(true);
  });

  it('não exclui registro em uso', () => {
    const p = aPerson();
    const s = aSnapshot()
      .withParty(p)
      .withProfile((pr) => ({ ...pr, charter: { ...pr.charter, managerId: p.id } }))
      .build();
    expect(errors(s, removeEntity('stakeholders', 'parties', p.id))[0]).toBe(
      'Não é possível excluir: usado em Ficha do projeto',
    );
  });

  it('reunião realizada com data futura', () => {
    const s = aSnapshot().build();
    expect(errors(s, upsertEntity('governance', 'meetings', aMeeting({ status: 'Realizada', date: '2026-02-01' })))).toEqual([
      'Reunião realizada não pode ter data futura.',
    ]);
    expect(run(s, upsertEntity('governance', 'meetings', aMeeting({ status: 'Realizada', date: '2026-01-05' }))).ok).toBe(true);
  });
});

describe('transições de mudança', () => {
  const base = () => aSnapshot().withParty(aPerson()).withChangeRequest(aChangeRequest()).build();
  const id = 'cr1' as never;

  it('somente transições permitidas', () => {
    expect(errors(base(), transitionChangeRequest(id, 'Aprovada', decision))).toEqual([
      'Transição de "Solicitada" para "Aprovada" não permitida.',
    ]);
    const analysis = apply(base(), transitionChangeRequest(id, 'Em análise'));
    expect(run(analysis, transitionChangeRequest(id, 'Aprovada')).ok).toBe(false);
    const approved = apply(analysis, transitionChangeRequest(id, 'Aprovada', decision));
    expect(approved.scope.changeRequests[id]?.status).toBe('Aprovada');
    expect(apply(approved, transitionChangeRequest(id, 'Implementada')).scope.changeRequests[id]?.status).toBe('Implementada');
    const withLb = apply(approved, defineInitialBaseline());
    expect(errors(withLb, transitionChangeRequest(id, 'Implementada'))).toEqual(['Use "Aplicar à linha de base".']);
  });
});

describe('linha de base', () => {
  const s0 = () =>
    aSnapshot()
      .withParty(aPerson())
      .withPackage(aPackage({ id: 'A', duration: 5 }))
      .withChangeRequest(aChangeRequest({ status: 'Aprovada', ...decision }))
      .build();

  it('v1 só uma vez; v2 só por mudança aprovada', () => {
    const v1 = apply(s0(), defineInitialBaseline());
    expect(errors(v1, defineInitialBaseline())).toEqual(['Linha de base já definida']);
    const solicited = { ...v1, scope: { ...v1.scope, changeRequests: { cr2: aChangeRequest({ id: 'cr2' as never }) } } };
    expect(run(solicited, applyChangeToBaseline('cr2' as never)).ok).toBe(false);

    const v2 = apply(v1, applyChangeToBaseline('cr1' as never));
    expect(v2.baselines).toHaveLength(2);
    expect(v2.baselines[1]?.version).toBe(2);
    expect(v2.baselines[1]?.changeRequestId).toBe('cr1');
    expect(v2.scope.changeRequests['cr1' as never]?.status).toBe('Implementada');
    expect(v2.baselines[0]).toEqual(v1.baselines[0]);
  });

  it('ciclo impede LB', () => {
    const s = aSnapshot()
      .withPackage(aPackage({ id: 'A', predecessorIds: ['B'] }), aPackage({ id: 'B', predecessorIds: ['A'] }))
      .build();
    expect(errors(s, defineInitialBaseline())).toEqual(['A EAP tem dependência circular']);
  });

  it('editar pacote não altera a LB', () => {
    const v1 = apply(s0(), defineInitialBaseline());
    const edited = apply(v1, upsertEntity('scope', 'wbs', { ...v1.scope.wbs['A' as never]!, duration: 9 }));
    expect(currentBaseline(edited)?.workPackages['A' as never]).toEqual({ start: '2026-01-05', finish: '2026-01-09', duration: 5 });
  });
});

describe('projeto encerrado', () => {
  const closed = () =>
    aSnapshot()
      .withProfile((p) => ({
        ...p,
        charter: { ...p.charter, status: 'Encerrado' },
        closure: { ...p.closure, closureTermSigned: true, actualDate: '2026-01-04' },
      }))
      .build();

  it('somente leitura, exceto reabrir', () => {
    expect(errors(closed(), upsertEntity('scope', 'requirements', aRequirement()))).toEqual([
      'Projeto encerrado: somente leitura.',
    ]);
    expect(apply(closed(), reopenProject()).governance.profile.charter.status).toBe('Em execução');
  });
});

describe('parâmetros', () => {
  it('fase em uso não pode ser removida', () => {
    const s = aSnapshot().withPackage(aPackage({ id: 'A', phase: 'Execução' })).build();
    const settings = { phases: ['Testes'], milestoneToleranceDays: 5, spiGreenMin: 0.95, spiYellowMin: 0.85 };
    expect(errors(s, updateModuleSettings('schedule', settings))[0]).toContain('Fase "Execução" está em uso');
    expect(run(s, updateModuleSettings('schedule', { ...settings, phases: ['Execução'] })).ok).toBe(true);
  });
});
