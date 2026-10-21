import type { Example } from '@/registers/examples';
import type { ChangeRequest, Deliverable, Requirement, WbsNode } from './index';

/** Exemplos fictícios e genéricos; nunca persistidos. */
export const requirementExamples: Example<Requirement>[] = [
  {
    title: 'Requisito técnico do cliente',
    explanation: 'Descreva o que precisa ser atendido e como será verificado no aceite.',
    values: {
      description: 'O painel deve operar com alimentação de 380 V trifásica.',
      category: 'Técnico',
      origin: 'Cliente',
      priority: 'Alta',
      validationStatus: 'Não validado',
      fulfillmentStatus: 'Não iniciado',
      acceptanceCriteria: 'Teste de energização aprovado no TAF.',
      lastValidation: null,
      deliverableIds: [],
    },
  },
  {
    title: 'Requisito regulatório',
    explanation: 'Normas obrigatórias também viram requisitos rastreáveis até os entregáveis.',
    values: {
      description: 'Instalação conforme NR-10.',
      category: 'Regulatório/Normativo',
      origin: 'Normativo/Regulatório',
      priority: 'Média',
      validationStatus: 'Não validado',
      fulfillmentStatus: 'Não iniciado',
      acceptanceCriteria: 'Laudo de conformidade emitido.',
      lastValidation: null,
      deliverableIds: [],
    },
  },
];

export const wbsExamples: Example<WbsNode>[] = [
  {
    title: 'Pacote de documentação',
    explanation: 'Pacote de trabalho: informe a duração em dias corridos; as datas são calculadas pelos predecessores.',
    values: {
      name: 'Elaborar memorial descritivo',
      kind: 'Pacote de trabalho',
      duration: 10,
      predecessorIds: [],
      startNoEarlierThan: null,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
      phase: 'Planejamento de Engenharia',
    },
  },
  {
    title: 'Pacote de execução',
    explanation: 'Use predecessores para indicar o que precisa terminar antes (Término→Início).',
    values: {
      name: 'Montagem do painel',
      kind: 'Pacote de trabalho',
      duration: 15,
      predecessorIds: [],
      startNoEarlierThan: null,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
      phase: 'Execução',
    },
  },
];

export const deliverableExamples: Example<Deliverable>[] = [
  {
    title: 'Documento de engenharia',
    explanation: 'Documentações têm revisão e template (vazio = herda o template definido na Governança).',
    values: {
      name: 'Memorial descritivo do sistema',
      category: 'Documentação de engenharia',
      type: 'Memorial descritivo',
      revision: '0',
      template: null,
      status: 'Em elaboração',
      plannedDate: null,
      actualDate: null,
      clientApproval: true,
    } as Partial<Deliverable>,
  },
  {
    title: 'Documento de gerenciamento',
    explanation: 'Relatórios e planos do gerenciamento do projeto.',
    values: {
      name: 'Relatório de status mensal',
      category: 'Documentação de gerenciamento de projeto',
      type: 'Relatório de status',
      revision: '0',
      template: null,
      status: 'Não iniciado',
      plannedDate: null,
      actualDate: null,
      clientApproval: false,
    } as Partial<Deliverable>,
  },
  {
    title: 'Entregável físico',
    explanation: 'Equipamentos, montagens e serviços não têm revisão nem template.',
    values: {
      name: 'Painel de controle montado',
      category: 'Entregável físico / serviço',
      type: 'Painel/Sistema',
      status: 'Não iniciado',
      plannedDate: null,
      actualDate: null,
      clientApproval: true,
    } as Partial<Deliverable>,
  },
];

export const changeRequestExamples: Example<ChangeRequest>[] = [
  {
    title: 'Mudança de especificação',
    explanation: 'Registre impacto em prazo (dias) e custo; valores negativos indicam antecipação ou economia.',
    values: {
      title: 'Troca do modelo do inversor',
      description: 'Fornecedor descontinuou o modelo especificado.',
      justification: 'Manter a disponibilidade de peças de reposição.',
      categories: ['Técnica', 'Custo'],
      scopeImpact: 'Atualizar folha de dados e diagrama unifilar.',
      scheduleImpactDays: 5,
      costImpactCents: 1250000,
      impactLevel: 'Médio',
      status: 'Solicitada',
      affectedWorkPackageIds: [],
      affectedDeliverableIds: [],
    },
  },
];
