import type { Example } from '@/registers/types';
import type { Milestone } from './model/milestone';

/** Exemplos fictícios — nunca persistidos. */
export const milestoneExamples: Example<Milestone>[] = [
  {
    title: 'Marco de teste',
    explanation:
      'Com predecessores, a previsão é o maior término dos pacotes. "Crítico" é calculado pelo caminho crítico, nunca marcado à mão.',
    values: { name: 'TAF do painel concluído', type: 'Teste (TAF/TAC/TAP/TDS)', phase: 'Testes', manualDate: null, actualDate: null },
  },
  {
    title: 'Marco contratual com data fixa',
    explanation: 'Sem predecessores, informe a data manual (obrigatória).',
    values: { name: 'Assinatura do contrato', type: 'Contratual', phase: 'Conceituação', manualDate: '2026-02-02', actualDate: null },
  },
];
