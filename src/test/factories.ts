/* Fábricas de entidades válidas para testes. */
import type {
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
import type { Organization, Person } from '@/modules/stakeholders';
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
