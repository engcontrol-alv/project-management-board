import { z } from 'zod';
import type { ChangeRequestId, DeliverableId, RequirementId, WorkPackageId } from '@/core/ids';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { requirementSchema, type Requirement } from './model/requirement';
import { wbsNodeSchema, type WbsNode } from './model/wbs';
import { deliverableSchema, type Deliverable } from './model/deliverable';
import { changeRequestSchema, type ChangeRequest } from './model/change-request';

const person = (field: string, label: string): RefDef => ({
  field,
  label,
  target: { module: 'stakeholders', collection: 'parties' },
  many: false,
  required: false,
  constraint: 'isPerson',
});

export const requirementsCollection: CollectionDef<Requirement> = {
  module: 'scope',
  name: 'requirements',
  table: 'scope_requirements',
  label: 'Requisitos',
  cardinality: 'many',
  schema: requirementSchema,
  codePrefix: 'REQ',
  refs: [
    person('ownerId', 'responsável'),
    {
      field: 'deliverableIds',
      label: 'entregáveis',
      target: { module: 'scope', collection: 'deliverables' },
      many: true,
      required: false,
    },
  ],
  describe: (r) => `${r.code} ${r.description}`,
};

export const wbsCollection: CollectionDef<WbsNode> = {
  module: 'scope',
  name: 'wbs',
  table: 'scope_wbs',
  label: 'EAP',
  cardinality: 'many',
  schema: wbsNodeSchema,
  refs: [
    {
      field: 'parentId',
      label: 'pai',
      target: { module: 'scope', collection: 'wbs' },
      many: false,
      required: false,
      constraint: 'isGroup',
    },
    {
      field: 'predecessorIds',
      label: 'predecessores',
      target: { module: 'scope', collection: 'wbs' },
      many: true,
      required: false,
      constraint: 'isWorkPackage',
    },
    person('ownerId', 'responsável'),
  ],
  describe: (n) => `${n.code} ${n.name}`,
};

export const deliverablesCollection: CollectionDef<Deliverable> = {
  module: 'scope',
  name: 'deliverables',
  table: 'scope_deliverables',
  label: 'Entregáveis',
  cardinality: 'many',
  schema: deliverableSchema,
  codePrefix: 'ENT',
  refs: [
    {
      field: 'workPackageId',
      label: 'pacote',
      target: { module: 'scope', collection: 'wbs' },
      many: false,
      required: false,
      constraint: 'isWorkPackage',
    },
    {
      field: 'milestoneId',
      label: 'marco',
      target: { module: 'schedule', collection: 'milestones' },
      many: false,
      required: false,
    },
    person('ownerId', 'responsável'),
  ],
  describe: (d) => `${d.code} ${d.name}`,
};

export const changeRequestsCollection: CollectionDef<ChangeRequest> = {
  module: 'scope',
  name: 'changeRequests',
  table: 'scope_changeRequests',
  label: 'Mudanças',
  cardinality: 'many',
  schema: changeRequestSchema,
  codePrefix: 'MUD',
  refs: [
    person('requesterId', 'solicitante'),
    person('approverId', 'aprovador'),
    person('implementerId', 'responsável pela implementação'),
    {
      field: 'affectedWorkPackageIds',
      label: 'pacotes afetados',
      target: { module: 'scope', collection: 'wbs' },
      many: true,
      required: false,
    },
    {
      field: 'affectedDeliverableIds',
      label: 'entregáveis afetados',
      target: { module: 'scope', collection: 'deliverables' },
      many: true,
      required: false,
    },
  ],
  describe: (c) => `${c.code} ${c.title}`,
};

function wbsKind(t: unknown): unknown {
  return t && typeof t === 'object' && 'kind' in t ? (t as WbsNode).kind : undefined;
}

export const scopeManifest: ModuleManifest<z.ZodObject<Record<string, never>>> = {
  id: 'scope',
  label: 'Escopo',
  mandatory: false,
  requires: [],
  settingsSchema: z.object({}),
  defaultSettings: {},
  collections: [
    requirementsCollection as CollectionDef,
    wbsCollection as CollectionDef,
    deliverablesCollection as CollectionDef,
    changeRequestsCollection as CollectionDef,
  ],
  constraints: {
    isGroup: (t) => (wbsKind(t) === 'Agrupador' ? null : 'deve ser um agrupador'),
    isWorkPackage: (t) => (wbsKind(t) === 'Pacote de trabalho' ? null : 'deve ser um pacote de trabalho'),
  },
};

export type ScopeData = {
  requirements: Record<RequirementId, Requirement>;
  wbs: Record<WorkPackageId, WbsNode>;
  deliverables: Record<DeliverableId, Deliverable>;
  changeRequests: Record<ChangeRequestId, ChangeRequest>;
};

export function emptyScopeData(): ScopeData {
  return { requirements: {}, wbs: {}, deliverables: {}, changeRequests: {} };
}
