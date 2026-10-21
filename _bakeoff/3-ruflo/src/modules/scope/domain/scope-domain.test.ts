import { describe, expect, it } from 'vitest';
import { aDocument, aPackage, aPhysical, aRequirement } from '@/test/factories';
import { requirementSituation, scopeRag } from './requirements';
import { findCycle } from './cycles';
import { deliverableProgress } from './deliverables';
import { allowedCrTransitions } from './change-requests';

describe('requirementSituation', () => {
  it('ordem de derivação', () => {
    expect(
      requirementSituation({ validationStatus: 'Validado', fulfillmentStatus: 'Não atendido (gap)' }),
    ).toBe('Gap crítico');
    expect(requirementSituation({ validationStatus: 'Validado', fulfillmentStatus: 'Atendido' })).toBe(
      'Concluído',
    );
    expect(
      requirementSituation({ validationStatus: 'Não validado', fulfillmentStatus: 'Em desenvolvimento' }),
    ).toBe('Não validado');
    expect(
      requirementSituation({ validationStatus: 'Em validação', fulfillmentStatus: 'Atendido' }),
    ).toBe('Pendente');
  });
});

describe('scopeRag', () => {
  it('casos da tabela de RAG', () => {
    expect(scopeRag([]).rag).toBe('n/a');
    expect(
      scopeRag([aRequirement({ priority: 'Alta', fulfillmentStatus: 'Não atendido (gap)' })]).rag,
    ).toBe('vermelho');
    expect(scopeRag([aRequirement({ priority: 'Alta', validationStatus: 'Não validado' })]).rag).toBe(
      'amarelo',
    );
    expect(
      scopeRag([aRequirement({ priority: 'Média', fulfillmentStatus: 'Não atendido (gap)' })]).rag,
    ).toBe('amarelo');
    expect(
      scopeRag([
        aRequirement({
          priority: 'Alta',
          validationStatus: 'Validado',
          lastValidation: '2026-01-01',
          fulfillmentStatus: 'Atendido',
        }),
      ]).rag,
    ).toBe('verde');
  });
});

describe('findCycle', () => {
  it('sem ciclo e com ciclo', () => {
    const chain = {
      A: aPackage({ id: 'A' }),
      B: aPackage({ id: 'B', predecessorIds: ['A'] }),
      C: aPackage({ id: 'C', predecessorIds: ['B'] }),
    };
    expect(findCycle(chain)).toBeNull();
    const loop = {
      A: aPackage({ id: 'A', predecessorIds: ['B'] }),
      B: aPackage({ id: 'B', predecessorIds: ['A'] }),
    };
    expect(findCycle(loop)).toEqual(expect.arrayContaining(['A', 'B']));
  });
});

describe('deliverableProgress', () => {
  it('conta concluídos por categoria e ignora cancelados', () => {
    const p = deliverableProgress([
      aDocument({ id: 'a' as never, status: 'Aprovado' }),
      aDocument({ id: 'b' as never, status: 'Cancelado' }),
      aPhysical({ status: 'Em execução' }),
    ]);
    expect(p['Documentação de engenharia']).toEqual({ done: 1, total: 1, percent: 100 });
    expect(p['Entregável físico / serviço']).toEqual({ done: 0, total: 1, percent: 0 });
    expect(p['Documentação de gerenciamento de projeto']).toEqual({ done: 0, total: 0, percent: null });
  });
});

describe('allowedCrTransitions', () => {
  it('máquina de estados', () => {
    expect(allowedCrTransitions('Solicitada')).toEqual(['Em análise', 'Cancelada']);
    expect(allowedCrTransitions('Em análise')).toEqual(['Aprovada', 'Rejeitada', 'Cancelada']);
    expect(allowedCrTransitions('Aprovada')).toEqual(['Implementada', 'Cancelada']);
    expect(allowedCrTransitions('Implementada')).toEqual([]);
    expect(allowedCrTransitions('Rejeitada')).toEqual([]);
    expect(allowedCrTransitions('Cancelada')).toEqual([]);
  });
});
