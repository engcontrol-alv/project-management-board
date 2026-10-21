import type { Party } from '@/modules/stakeholders';
import type { ChangeRequest, Deliverable, Requirement, WbsNode } from '@/modules/scope';
import type { Milestone } from '@/modules/schedule';
import type { Lesson, Meeting, Norm } from '@/modules/governance';
import type { Project } from '@/project/project';
import { emptySnapshot, type ProjectSnapshot } from '@/project/snapshot';
import { defaultConfig } from '@/project/config';
import { SCHEMA_VERSION } from '@/project/migrations';
import type { CommandContext } from '@/commands/run';

export const START = '2026-01-05';
export const NOW = '2026-01-05T10:00:00.000Z';

export function aProject(p: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    schemaVersion: SCHEMA_VERSION,
    info: { name: 'Projeto Teste', code: 'PT-01', startDate: START },
    config: defaultConfig(),
    statusDate: START,
    counters: {},
    createdAt: NOW,
    updatedAt: NOW,
    ...p,
  } as Project;
}

let seq = 0;
export function testCtx(today = START): CommandContext {
  return { now: NOW, today, newId: () => `id-${++seq}` };
}

export function person(id: string, p: Partial<Party> = {}): Party {
  return {
    id,
    kind: 'Pessoa',
    code: `PI-${id}`,
    name: `Pessoa ${id}`,
    position: '',
    organizationId: null,
    contact: '',
    internal: 'Interno',
    notes: '',
    ...p,
  } as Party;
}

export function org(id: string, roles: string[] = ['Cliente'], p: Partial<Party> = {}): Party {
  return {
    id,
    kind: 'Organização',
    code: `PI-${id}`,
    name: `Org ${id}`,
    roles,
    taxId: '',
    country: 'Brasil',
    contact: '',
    internal: 'Externo',
    notes: '',
    ...p,
  } as Party;
}

export function pkg(id: string, duration: number, predecessorIds: string[] = [], p: Partial<WbsNode> = {}): WbsNode {
  return {
    id,
    code: id,
    name: `Pacote ${id}`,
    parentId: null,
    kind: 'Pacote de trabalho',
    duration,
    predecessorIds,
    startNoEarlierThan: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    ownerId: null,
    phase: '',
    ...p,
  } as WbsNode;
}

export function group(id: string, p: Partial<WbsNode> = {}): WbsNode {
  return pkg(id, 0, [], { kind: 'Agrupador', ...p });
}

export function milestone(id: string, predecessorIds: string[] = [], p: Partial<Milestone> = {}): Milestone {
  return {
    id,
    code: `M-${id}`,
    name: `Marco ${id}`,
    phase: '',
    type: 'Contratual',
    predecessorIds,
    manualDate: predecessorIds.length ? null : START,
    actualDate: null,
    ownerId: null,
    ...p,
  } as Milestone;
}

export function requirement(id: string, p: Partial<Requirement> = {}): Requirement {
  return {
    id,
    code: `REQ-${id}`,
    description: `Requisito ${id}`,
    category: 'Funcional',
    origin: 'Cliente',
    priority: 'Média',
    validationStatus: 'Não validado',
    fulfillmentStatus: 'Não iniciado',
    acceptanceCriteria: '',
    ownerId: null,
    lastValidation: null,
    deliverableIds: [],
    ...p,
  } as Requirement;
}

export function changeRequest(id: string, p: Partial<ChangeRequest> = {}): ChangeRequest {
  return {
    id,
    code: `MUD-${id}`,
    title: `Mudança ${id}`,
    description: '',
    justification: '',
    requesterId: null,
    requestDate: START,
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
    ...p,
  } as ChangeRequest;
}

export function docDeliverable(id: string, p: Record<string, unknown> = {}): Deliverable {
  return {
    id,
    code: `ENT-${id}`,
    name: `Entregável ${id}`,
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
    ...p,
  } as Deliverable;
}

export function norm(id: string): Norm {
  return { id, code: `NRM-${id}`, standard: 'ISO 9001:2015', type: 'ISO', title: 'Qualidade', notes: '' } as Norm;
}

export function meeting(id: string, p: Partial<Meeting> = {}): Meeting {
  return {
    id,
    code: `REU-${id}`,
    type: 'Status semanal',
    date: START,
    participantIds: [],
    decisions: '',
    actions: '',
    status: 'Agendada',
    ...p,
  } as Meeting;
}

export function lesson(id: string): Lesson {
  return {
    id,
    code: `LIC-${id}`,
    title: 'Lição',
    type: 'Boa prática',
    category: 'Técnica',
    context: '',
    recommendation: '',
    date: null,
    ownerId: null,
  } as Lesson;
}

/** Builder fluente de snapshots para testes. */
export class SnapshotBuilder {
  s: ProjectSnapshot;
  constructor(project: Project = aProject()) {
    this.s = emptySnapshot(project);
  }
  with(fn: (s: ProjectSnapshot) => void): this {
    fn(this.s);
    return this;
  }
  parties(...ps: Party[]): this {
    for (const p of ps) (this.s.stakeholders.parties as Record<string, Party>)[p.id] = p;
    return this;
  }
  wbs(...ns: WbsNode[]): this {
    for (const n of ns) (this.s.scope.wbs as Record<string, WbsNode>)[n.id] = n;
    return this;
  }
  milestones(...ms: Milestone[]): this {
    for (const m of ms) (this.s.schedule.milestones as Record<string, Milestone>)[m.id] = m;
    return this;
  }
  requirements(...rs: Requirement[]): this {
    for (const r of rs) (this.s.scope.requirements as Record<string, Requirement>)[r.id] = r;
    return this;
  }
  changeRequests(...cs: ChangeRequest[]): this {
    for (const c of cs) (this.s.scope.changeRequests as Record<string, ChangeRequest>)[c.id] = c;
    return this;
  }
  deliverables(...ds: Deliverable[]): this {
    for (const d of ds) (this.s.scope.deliverables as Record<string, Deliverable>)[d.id] = d;
    return this;
  }
  build(): ProjectSnapshot {
    return this.s;
  }
}

export const aSnapshot = (project?: Project) => new SnapshotBuilder(project);
