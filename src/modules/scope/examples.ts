import type { Example } from '@/registers/types';
import type { ChangeRequest } from './model/change-request';
import type { Deliverable } from './model/deliverable';
import type { Requirement } from './model/requirement';
import type { WbsNode } from './model/wbs';

/** Exemplos genéricos e fictícios — nunca persistidos. */
export const requirementExamples: Example<Requirement>[] = [
  {
    title: 'Requisito técnico do cliente',
    explanation:
      'Descreva o que precisa ser atendido e como será aceito. "Validação" diz se o cliente confirmou; "Atendimento" diz se a solução já entrega.',
    values: {
      description: 'O painel deve operar com tensão de alimentação de 380 V trifásica.',
      category: 'Técnico',
      origin: 'Cliente',
      priority: 'Alta',
      validationStatus: 'Em validação',
      fulfillmentStatus: 'Em desenvolvimento',
      acceptanceCriteria: 'Ensaio de funcionamento no TAF com 380 V ± 10%.',
      lastValidation: null,
    },
  },
];

export const wbsExamples: Example<WbsNode>[] = [
  {
    title: 'Pacote de documentação',
    explanation:
      'Pacotes de trabalho têm duração em dias corridos; as datas planejadas são calculadas a partir dos predecessores e do início do projeto.',
    values: {
      name: 'Elaborar memorial descritivo',
      kind: 'Pacote de trabalho',
      duration: 10,
      percentComplete: 0,
      phase: 'Planejamento de Engenharia',
    },
  },
  {
    title: 'Pacote de execução',
    explanation: 'Use "Não começar antes de" para restrições externas (ex.: liberação da área).',
    values: {
      name: 'Montagem do painel',
      kind: 'Pacote de trabalho',
      duration: 15,
      percentComplete: 0,
      phase: 'Execução',
    },
  },
  {
    title: 'Agrupador',
    explanation: 'Agrupadores só organizam a EAP: datas e % são agregados dos pacotes filhos.',
    values: { name: 'Engenharia', kind: 'Agrupador', duration: 0 },
  },
];

export const deliverableExamples: Example<Deliverable>[] = [
  {
    title: 'Documentação de engenharia',
    explanation: 'Documentos técnicos previstos. Revisão e template valem só para documentações.',
    values: {
      name: 'Diagrama unifilar do painel principal',
      category: 'Documentação de engenharia',
      type: 'Diagrama (P&ID, unifilar, elétrico)',
      revision: '0',
      template: null,
      status: 'Em elaboração',
      clientApproval: true,
    },
  },
  {
    title: 'Documentação de gerenciamento',
    explanation: 'Documentos de gestão do projeto, como o plano e os relatórios de status.',
    values: {
      name: 'Plano de projeto',
      category: 'Documentação de gerenciamento de projeto',
      type: 'Plano de projeto',
      revision: 'A',
      template: 'Interno',
      status: 'Não iniciado',
      clientApproval: false,
    },
  },
  {
    title: 'Entregável físico',
    explanation: 'Equipamentos, montagens e serviços, com status próprios até o aceite do cliente.',
    values: {
      name: 'Painel elétrico de distribuição',
      category: 'Entregável físico / serviço',
      type: 'Painel/Sistema',
      status: 'Não iniciado',
      clientApproval: true,
    },
  },
];

export const changeRequestExamples: Example<ChangeRequest>[] = [
  {
    title: 'Mudança de prazo e custo',
    explanation:
      'Registre o impacto em dias (negativo = antecipação) e em custo (negativo = economia). Só uma mudança aprovada pode revisar a linha de base.',
    values: {
      title: 'Inclusão de um segundo painel',
      description: 'Cliente solicitou um painel adicional para a ampliação.',
      justification: 'Ampliação da planta prevista para o próximo ano.',
      categories: ['Escopo', 'Cronograma', 'Custo'],
      scopeImpact: 'Novo pacote de montagem e novo diagrama unifilar.',
      scheduleImpactDays: 20,
      costImpactCents: 15000000,
      impactLevel: 'Alto',
    },
  },
];
