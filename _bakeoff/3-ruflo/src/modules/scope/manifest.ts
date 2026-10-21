import { z } from 'zod';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { requirementSchema, type Requirement } from './model/requirement';
import { wbsNodeSchema, type WbsNode } from './model/wbs';
import { deliverableSchema, type Deliverable } from './model/deliverable';

const person = (field: string, label: string): RefDef => ({
  field,
  label,
  target: { module: 'stakeholders', collection: 'parties' },
  many: false,
  required: false,
  constraint: 'isPerson',
});

const requirements: CollectionDef<Requirement> = {
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
  describe: (r) => `${r.code} ${r.description}`.trim(),
};

const wbs: CollectionDef<WbsNode> = {
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
      label: 'predecessor',
      target: { module: 'scope', collection: 'wbs' },
      many: true,
      required: false,
      constraint: 'isWorkPackage',
    },
    person('ownerId', 'responsável'),
  ],
  describe: (n) => `${n.code} ${n.name}`.trim(),
};

const deliverables: CollectionDef<Deliverable> = {
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
      label: 'pacote de trabalho',
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
  describe: (d) => `${d.code} ${d.name}`.trim(),
};

const kindOf = (t: unknown) =>
  t && typeof t === 'object' && 'kind' in t ? (t as { kind: unknown }).kind : undefined;

const settingsSchema = z.object({});

export const scopeManifest: ModuleManifest<typeof settingsSchema> = {
  id: 'scope',
  label: 'Escopo',
  mandatory: false,
  requires: [],
  settingsSchema,
  defaultSettings: {},
  collections: [requirements, wbs, deliverables],
  constraints: {
    isGroup: (t) => (kindOf(t) === 'Agrupador' ? null : 'deve ser um agrupador'),
    isWorkPackage: (t) =>
      kindOf(t) === 'Pacote de trabalho' ? null : 'deve ser um pacote de trabalho',
  },
};
