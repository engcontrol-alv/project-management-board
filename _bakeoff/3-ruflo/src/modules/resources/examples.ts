import type { Example } from '@/registers/types';
import type { Allocation } from './model/allocation';
import type { Resource } from './model/resource';

/** Exemplos fictícios — nunca persistidos. */
export const resourceExamples: Example<Resource>[] = [
  {
    title: 'Engenheiro de automação',
    explanation:
      'Capacidade é a dedicação ao projeto. O custo homem-hora gera um custo estimado informativo nas alocações (não cria linha de orçamento).',
    values: {
      name: 'Engenheiro de automação sênior',
      type: 'Pessoa interna',
      role: 'Engenharia de automação',
      skill: 'CLP/SCADA',
      skillLevel: 'Sênior',
      capacityPct: 100,
      hourlyRateCents: 18_000,
    },
  },
  {
    title: 'Equipe de montagem terceirizada',
    explanation: 'Equipes e terceirizados podem apontar para a organização prestadora do serviço.',
    values: { name: 'Equipe de montagem elétrica', type: 'Equipe', role: 'Montagem', capacityPct: 100, hourlyRateCents: 42_000 },
  },
];

export const allocationExamples: Example<Allocation>[] = [
  {
    title: 'Alocação em pacote',
    explanation: 'Alocações que cruzam a mesma semana se somam; acima da capacidade, o recurso fica sobrealocado.',
    values: { pct: 50, start: '2026-03-02', finish: '2026-03-13', status: 'Planejada' },
  },
];
