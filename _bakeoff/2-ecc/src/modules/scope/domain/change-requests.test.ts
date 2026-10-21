import { allowedCrTransitions } from './change-requests';

describe('allowedCrTransitions', () => {
  it('máquina de estados do SPEC §6.2d', () => {
    expect(allowedCrTransitions('Solicitada')).toEqual(['Em análise', 'Cancelada']);
    expect(allowedCrTransitions('Em análise')).toEqual(['Aprovada', 'Rejeitada', 'Cancelada']);
    expect(allowedCrTransitions('Aprovada')).toEqual(['Implementada', 'Cancelada']);
    expect(allowedCrTransitions('Implementada')).toEqual([]);
    expect(allowedCrTransitions('Rejeitada')).toEqual([]);
    expect(allowedCrTransitions('Cancelada')).toEqual([]);
  });
});
