import { requirementSituation, scopeRag } from './requirements';
import type { Requirement } from '../model/requirement';

const r = (p: Partial<Requirement>): Requirement =>
  ({
    priority: 'Média',
    validationStatus: 'Validado',
    fulfillmentStatus: 'Atendido',
    ...p,
  }) as Requirement;

describe('requirementSituation', () => {
  it('ordem de derivação', () => {
    expect(requirementSituation(r({ fulfillmentStatus: 'Não atendido (gap)' }))).toBe('Gap crítico');
    expect(requirementSituation(r({}))).toBe('Concluído');
    expect(
      requirementSituation(r({ validationStatus: 'Não validado', fulfillmentStatus: 'Em desenvolvimento' })),
    ).toBe('Não validado');
    expect(requirementSituation(r({ validationStatus: 'Em validação' }))).toBe('Pendente');
  });
});

describe('scopeRag', () => {
  it('faixas', () => {
    expect(scopeRag([]).rag).toBe('n/a');
    expect(scopeRag([r({ priority: 'Alta', fulfillmentStatus: 'Não atendido (gap)' })]).rag).toBe('vermelho');
    expect(scopeRag([r({ priority: 'Alta', validationStatus: 'Não validado' })]).rag).toBe('amarelo');
    expect(scopeRag([r({ fulfillmentStatus: 'Não atendido (gap)' })]).rag).toBe('amarelo');
    expect(scopeRag([r({}), r({ priority: 'Alta' })]).rag).toBe('verde');
  });
});
