/* Fábricas de entidades válidas para testes. */
import type {
  AllocationId,
  BudgetLineId,
  CommunicationId,
  ProcurementId,
  ResourceId,
  RiskId,
  ChangeRequestId,
  DeliverableId,
  LessonId,
  MeetingId,
  MilestoneId,
  NormId,
  PartyId,
  RequirementId,
  WorkPackageId,
} from '@/core/ids';
import type { Communication, Organization, Person, StakeholderAnalysis } from '@/modules/stakeholders';
import type { BudgetLine, Procurement } from '@/modules/finances';
import type { Risk } from '@/modules/risks';
import type { Allocation, Resource } from '@/modules/resources';
import type { ChangeRequest, Deliverable, Requirement, WbsNode } from '@/modules/scope';
import type { Milestone } from '@/modules/schedule';
import type { Lesson, Meeting, Norm } from '@/modules/governance';

export function aPerson(o: Partial<Person> = {}): Person {
  return {
    id: 'p1' as PartyId,
    kind: 'Pessoa',
    code: 'PI-001',
    name: 'Pessoa Teste',
    position: '',
    organizationId: null,
    contact: '',
    internal: 'Interno',
    notes: '',
    analysis: null,
    ...o,
  };
}

export function anOrganization(o: Partial<Organization> = {}): Organization {
  return {
    id: 'o1' as PartyId,
    kind: 'Organização',
    code: 'PI-002',
    name: 'Organização Teste',
    roles: ['Cliente'],
    taxId: '',
    country: 'Brasil',
    contact: '',
    internal: 'Externo',
    notes: '',
    analysis: null,
    ...o,
  };
}

export function aRequirement(o: Partial<Requirement> = {}): Requirement {
  return {
    id: 'r1' as RequirementId,
    code: 'REQ-001',
    description: 'Requisito teste',
    category: 'Funcional',
    origin: 'Cliente',
    priority: 'Média',
    validationStatus: 'Não validado',
    fulfillmentStatus: 'Não iniciado',
    acceptanceCriteria: '',
    ownerId: null,
    lastValidation: null,
    deliverableIds: [],
    ...o,
  };
}

type LooseWbs = Omit<Partial<WbsNode>, 'id' | 'parentId' | 'predecessorIds'> & {
  id: string;
  parentId?: string | null;
  predecessorIds?: string[];
};

export function aPackage(o: LooseWbs): WbsNode {
  return {
    code: '1',
    name: `Pacote ${o.id}`,
    parentId: null,
    kind: 'Pacote de trabalho',
    duration: 1,
    predecessorIds: [],
    startNoEarlierThan: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    ownerId: null,
    phase: '',
    ...o,
    id: o.id as WorkPackageId,
  } as WbsNode;
}

export function aGroup(o: LooseWbs): WbsNode {
  return aPackage({ kind: 'Agrupador', duration: 0, name: `Grupo ${o.id}`, ...o });
}

export function aDocument(o: Partial<Extract<Deliverable, { revision: string }>> = {}): Deliverable {
  return {
    id: 'd1' as DeliverableId,
    code: 'ENT-001',
    name: 'Memorial',
    category: 'Documentação de engenharia',
    type: 'Memorial descritivo',
    revision: '0',
    template: null,
    status: 'Em elaboração',
    workPackageId: null,
    milestoneId: null,
    plannedDate: null,
    actualDate: null,
    ownerId: null,
    clientApproval: false,
    ...o,
  } as Deliverable;
}

export function aPhysical(o: Partial<Extract<Deliverable, { category: 'Entregável físico / serviço' }>> = {}): Deliverable {
  return {
    id: 'd2' as DeliverableId,
    code: 'ENT-002',
    name: 'Painel',
    category: 'Entregável físico / serviço',
    type: 'Painel/Sistema',
    status: 'Em execução',
    workPackageId: null,
    milestoneId: null,
    plannedDate: null,
    actualDate: null,
    ownerId: null,
    clientApproval: false,
    fatStatus: 'Não Aplicável',
    fatDate: null,
    satStatus: 'Não Aplicável',
    satDate: null,
    ...o,
  };
}

export function aChangeRequest(o: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id: 'cr1' as ChangeRequestId,
    code: 'MUD-001',
    title: 'Mudança teste',
    description: '',
    justification: '',
    requesterId: null,
    requestDate: '2026-01-01',
    categories: [],
    scopeImpact: '',
    affectedWorkPackageIds: [],
    affectedDeliverableIds: [],
    scheduleImpactDays: null,
    costImpactCents: null,
    impactLevel: null,
    status: 'Solicitada',
    approverId: null,
    decisionDate: null,
    implementerId: null,
    ...o,
  };
}

export function aMilestone(o: Partial<Milestone> = {}): Milestone {
  return {
    id: 'm1' as MilestoneId,
    code: 'M-001',
    name: 'Marco teste',
    phase: '',
    type: 'Contratual',
    predecessorIds: [],
    manualDate: '2026-02-01',
    actualDate: null,
    ownerId: null,
    ...o,
  };
}

export function aNorm(o: Partial<Norm> = {}): Norm {
  return {
    id: 'n1' as NormId,
    code: 'NRM-001',
    standard: 'ISO 9001:2015',
    type: 'ISO',
    title: 'Sistemas de gestão da qualidade',
    notes: '',
    ...o,
  };
}

export function aMeeting(o: Partial<Meeting> = {}): Meeting {
  return {
    id: 'mt1' as MeetingId,
    code: 'REU-001',
    type: 'Status semanal',
    date: '2026-01-10',
    participantIds: [],
    decisions: '',
    actions: '',
    status: 'Agendada',
    ...o,
  };
}

export function aLesson(o: Partial<Lesson> = {}): Lesson {
  return {
    id: 'l1' as LessonId,
    code: 'LIC-001',
    title: 'Lição teste',
    type: 'Boa prática',
    category: 'Técnica',
    context: '',
    recommendation: '',
    date: null,
    ownerId: null,
    ...o,
  };
}

export function anAnalysis(o: Partial<StakeholderAnalysis> = {}): StakeholderAnalysis {
  return {
    interests: '',
    power: 'Alto',
    interest: 'Alto',
    currentPosture: 'Apoiador',
    desiredPosture: 'Apoiador',
    engagementStrategy: '',
    relationshipOwnerId: null,
    ...o,
  };
}

export function aCommunication(o: Partial<Communication> = {}): Communication {
  return {
    id: 'com1' as CommunicationId,
    code: 'COM-001',
    information: 'Relatório semanal de avanço',
    recipientIds: [],
    channel: 'E-mail',
    frequency: 'Semanal',
    ownerId: null,
    nextDate: null,
    ...o,
  };
}

export function aBudgetLine(o: Partial<BudgetLine> = {}): BudgetLine {
  return {
    id: 'orc1' as BudgetLineId,
    code: 'ORC-001',
    description: 'Mão de obra de engenharia',
    kind: 'Custo',
    nature: 'OPEX',
    category: 'Mão de obra',
    currency: 'BRL',
    rate: null,
    budgetedCents: 100_000,
    actualCents: 0,
    plannedDate: null,
    actualDate: null,
    status: 'Planejado',
    workPackageId: null,
    milestoneId: null,
    partyId: null,
    ownerId: null,
    ...o,
  };
}

export function aProcurement(o: Partial<Procurement> = {}): Procurement {
  return {
    id: 'ctr1' as ProcurementId,
    code: 'CTR-001',
    description: 'Painéis de automação',
    type: 'Produto',
    nature: 'CAPEX',
    supplierId: 'sup1' as PartyId,
    origin: 'Nacional',
    country: '',
    currency: 'BRL',
    rate: null,
    workPackageId: null,
    milestoneId: null,
    criticality: 'Média',
    ownerId: null,
    budgetedCents: 1_000_000,
    committedCents: 0,
    actualCents: 0,
    contractStatus: 'A solicitar',
    deliveryStatus: 'Não iniciado',
    requestDate: null,
    dueDate: null,
    completionDate: null,
    ...o,
  };
}

/** Organização fornecedora com o id padrão de `aProcurement`. */
export function aSupplier(o: Partial<Organization> = {}): Organization {
  return anOrganization({ id: 'sup1' as PartyId, code: 'PI-010', name: 'Fornecedor Teste', roles: ['Fornecedor'], ...o });
}

export function aRisk(o: Partial<Risk> = {}): Risk {
  return {
    id: 'r1' as RiskId,
    code: 'R-001',
    title: 'Atraso na importação do CLP',
    nature: 'Ameaça',
    category: 'Fornecedor/Aquisição',
    description: '',
    rootCause: '',
    probability: 2,
    impact: 2,
    responseType: null,
    responseAction: '',
    ownerId: null,
    status: 'Identificado',
    nextReview: null,
    notes: '',
    probabilityPct: null,
    costImpactCents: null,
    scheduleImpactDays: null,
    workPackageIds: [],
    milestoneIds: [],
    deliverableIds: [],
    procurementIds: [],
    partyIds: [],
    reassess: null,
    ...o,
  };
}

export function aResource(o: Partial<Resource> = {}): Resource {
  return {
    id: 'rec1' as ResourceId,
    code: 'REC-001',
    name: 'Engenheiro de automação',
    type: 'Pessoa interna',
    role: 'Engenharia',
    skill: 'CLP/SCADA',
    skillLevel: 'Sênior',
    capacityPct: 100,
    hourlyRateCents: 15_000,
    personId: null,
    organizationId: null,
    ...o,
  };
}

export function anAllocation(o: Partial<Allocation> = {}): Allocation {
  return {
    id: 'alo1' as AllocationId,
    code: 'ALO-001',
    resourceId: 'rec1' as ResourceId,
    workPackageId: null,
    pct: 50,
    start: '2026-01-05',
    finish: '2026-01-09',
    status: 'Ativa',
    ...o,
  };
}
