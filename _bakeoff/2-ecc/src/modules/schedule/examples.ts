import type { Example } from '@/registers/examples';
import type { Milestone } from './index';

/** Exemplos fictícios; nunca persistidos. */
export const milestoneExamples: Example<Milestone>[] = [
  {
    title: 'Marco de teste',
    explanation: 'Ligue o marco aos pacotes que precisam terminar: a previsão e o "crítico" são calculados.',
    values: { name: 'TAF do painel aprovado', phase: 'Testes', type: 'Teste (TAF/TAC/TAP/TDS)', predecessorIds: [], manualDate: null, actualDate: null },
  },
  {
    title: 'Marco contratual com data fixa',
    explanation: 'Sem predecessores, informe a data manual combinada em contrato.',
    values: { name: 'Assinatura do contrato', phase: 'Conceituação', type: 'Contratual', predecessorIds: [], manualDate: null, actualDate: null },
  },
];
