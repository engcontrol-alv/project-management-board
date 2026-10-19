/* Builders de snapshot para testes: aSnapshot().withPackage(...).build() */
import type { ProjectId } from '@/core/ids';
import type { Party } from '@/modules/stakeholders';
import type { ChangeRequest, Deliverable, Requirement, WbsNode } from '@/modules/scope';
import type { Milestone } from '@/modules/schedule';
import type { GovernanceProfile, Lesson, Meeting, Norm } from '@/modules/governance';
import type { Baseline } from '@/project/baseline';
import { defaultConfig } from '@/project/config';
import type { Project, ProjectConfig } from '@/project/project';
import { emptySnapshot, type ProjectSnapshot } from '@/project/snapshot';
import type { CommandContext } from '@/commands/run';

export const PROJECT_START = '2026-01-05';

export function aProject(o: Partial<Project> = {}): Project {
  return {
    id: 'proj-1' as ProjectId,
    schemaVersion: 1,
    info: { name: 'Projeto Teste', code: 'PT-01', startDate: PROJECT_START },
    config: defaultConfig(),
    statusDate: null,
    counters: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...o,
  };
}

const byId = <T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map((i) => [i.id, i])) as Record<T['id'], T>;

export class SnapshotBuilder {
  private s: ProjectSnapshot;
  constructor(project: Project = aProject()) {
    this.s = emptySnapshot(project);
  }
  withProject(o: Partial<Project>) {
    this.s = { ...this.s, project: { ...this.s.project, ...o } };
    return this;
  }
  withConfig(config: ProjectConfig) {
    return this.withProject({ config });
  }
  withStatusDate(d: string) {
    return this.withProject({ statusDate: d });
  }
  withParty(...ps: Party[]) {
    this.s.stakeholders = { parties: { ...this.s.stakeholders.parties, ...byId(ps) } };
    return this;
  }
  withRequirement(...rs: Requirement[]) {
    this.s.scope = { ...this.s.scope, requirements: { ...this.s.scope.requirements, ...byId(rs) } };
    return this;
  }
  withPackage(...ns: WbsNode[]) {
    this.s.scope = { ...this.s.scope, wbs: { ...this.s.scope.wbs, ...byId(ns) } };
    return this;
  }
  withDeliverable(...ds: Deliverable[]) {
    this.s.scope = { ...this.s.scope, deliverables: { ...this.s.scope.deliverables, ...byId(ds) } };
    return this;
  }
  withChangeRequest(...cs: ChangeRequest[]) {
    this.s.scope = { ...this.s.scope, changeRequests: { ...this.s.scope.changeRequests, ...byId(cs) } };
    return this;
  }
  withMilestone(...ms: Milestone[]) {
    this.s.schedule = { milestones: { ...this.s.schedule.milestones, ...byId(ms) } };
    return this;
  }
  withNorm(...ns: Norm[]) {
    this.s.governance = { ...this.s.governance, norms: { ...this.s.governance.norms, ...byId(ns) } };
    return this;
  }
  withMeeting(...ms: Meeting[]) {
    this.s.governance = { ...this.s.governance, meetings: { ...this.s.governance.meetings, ...byId(ms) } };
    return this;
  }
  withLesson(...ls: Lesson[]) {
    this.s.governance = { ...this.s.governance, lessons: { ...this.s.governance.lessons, ...byId(ls) } };
    return this;
  }
  withProfile(fn: (p: GovernanceProfile) => GovernanceProfile) {
    this.s.governance = { ...this.s.governance, profile: fn(this.s.governance.profile) };
    return this;
  }
  withBaseline(...bs: Baseline[]) {
    this.s = { ...this.s, baselines: [...this.s.baselines, ...bs] };
    return this;
  }
  build(): ProjectSnapshot {
    return structuredClone(this.s);
  }
}

export function aSnapshot(project?: Project) {
  return new SnapshotBuilder(project);
}

let seq = 0;
export function aContext(o: Partial<CommandContext> = {}): CommandContext {
  return {
    now: '2026-01-05T12:00:00.000Z',
    today: PROJECT_START,
    newId: () => `id-${++seq}`,
    ...o,
  };
}
