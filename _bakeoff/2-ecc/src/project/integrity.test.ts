import { findIntegrityErrors, whereUsed } from './integrity';
import { aSnapshot, changeRequest, group, org, person, pkg, requirement, milestone } from '@/test/builders';

describe('whereUsed', () => {
  it('lista todos os registros que apontam para a pessoa', () => {
    const s = aSnapshot()
      .parties(person('X'))
      .requirements(requirement('R1', { ownerId: 'X' as never }))
      .with((s) => (s.governance.profile.charter.managerId = 'X' as never))
      .build();
    const used = whereUsed(s, 'X');
    expect(used).toHaveLength(2);
    expect(used.map((u) => u.collection).sort()).toEqual(['profile', 'requirements']);
    expect(used.find((u) => u.collection === 'requirements')?.label).toBe('REQ-R1 Requisito R1');
  });
  it('pai e predecessor contam como vínculo', () => {
    const s = aSnapshot()
      .wbs(group('G'), pkg('A', 1, [], { parentId: 'G' as never }), pkg('B', 1, ['A']))
      .milestones(milestone('M', ['B']))
      .build();
    expect(whereUsed(s, 'G').map((u) => u.id)).toEqual(['A']);
    expect(whereUsed(s, 'A').map((u) => u.id)).toEqual(['B']);
    expect(whereUsed(s, 'B').map((u) => u.id)).toEqual(['M']);
  });
});

describe('findIntegrityErrors', () => {
  it('snapshot consistente → []', () => {
    const s = aSnapshot()
      .parties(person('P'), org('C', ['Cliente']))
      .wbs(pkg('A', 1), pkg('B', 1, ['A']))
      .requirements(requirement('R', { ownerId: 'P' as never }))
      .with((s) => (s.governance.profile.charter.clientId = 'C' as never))
      .build();
    expect(findIntegrityErrors(s)).toEqual([]);
  });
  it('alvo inexistente cita o registro de origem', () => {
    const s = aSnapshot().requirements(requirement('R', { code: 'REQ-001', ownerId: 'nao-existe' as never })).build();
    expect(findIntegrityErrors(s)).toEqual(['REQ-001 Requisito R: responsável aponta para um registro inexistente']);
  });
  it('predecessor agrupador, ciclo, solicitante organização e cliente sem papel', () => {
    const s = aSnapshot()
      .parties(org('O', ['Fornecedor']))
      .wbs(group('G'), pkg('A', 1, ['G']), pkg('X', 1, ['Y']), pkg('Y', 1, ['X']))
      .changeRequests(changeRequest('C', { requesterId: 'O' as never }))
      .with((s) => (s.governance.profile.charter.clientId = 'O' as never))
      .build();
    const errors = findIntegrityErrors(s);
    expect(errors).toEqual(
      expect.arrayContaining([
        'A Pacote A: predecessores deve ser um pacote de trabalho',
        'MUD-C Mudança C: solicitante deve ser uma pessoa',
        'Ficha do projeto: cliente deve ser uma organização com papel Cliente',
      ]),
    );
    expect(errors.some((e) => e.startsWith('EAP: dependência circular'))).toBe(true);
  });
  it('vínculo para registro de outro tipo', () => {
    const s = aSnapshot().wbs(pkg('A', 1)).requirements(requirement('R', { ownerId: 'A' as never })).build();
    expect(findIntegrityErrors(s)).toEqual(['REQ-R Requisito R: responsável aponta para um registro de outro tipo']);
  });
});
