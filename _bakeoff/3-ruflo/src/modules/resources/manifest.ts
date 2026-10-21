import { z } from 'zod';
import type { CollectionDef, ModuleManifest } from '@/core/module-contract';
import { allocationSchema, type Allocation } from './model/allocation';
import { resourceSchema, type Resource } from './model/resource';

const resources: CollectionDef<Resource> = {
  module: 'resources',
  name: 'resources',
  table: 'resources_resources',
  label: 'Recursos',
  cardinality: 'many',
  schema: resourceSchema,
  codePrefix: 'REC',
  refs: [
    {
      field: 'personId',
      label: 'pessoa',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isPerson',
    },
    {
      field: 'organizationId',
      label: 'organização',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isOrganization',
    },
  ],
  describe: (r) => `${r.code} ${r.name}`.trim(),
};

const allocations: CollectionDef<Allocation> = {
  module: 'resources',
  name: 'allocations',
  table: 'resources_allocations',
  label: 'Alocações',
  cardinality: 'many',
  schema: allocationSchema,
  codePrefix: 'ALO',
  refs: [
    {
      field: 'resourceId',
      label: 'recurso',
      target: { module: 'resources', collection: 'resources' },
      many: false,
      required: true,
    },
    {
      field: 'workPackageId',
      label: 'pacote',
      target: { module: 'scope', collection: 'wbs' },
      many: false,
      required: false,
      constraint: 'isWorkPackage',
    },
  ],
  describe: (a) => `${a.code} ${a.start} → ${a.finish} (${a.pct}%)`.trim(),
};

export const resourcesSettingsSchema = z
  .object({
    overallocationRedPct: z.number().int().min(100),
    hoursPerDay: z.number().min(1).max(24),
  })
  .strict();
export type ResourcesSettings = z.infer<typeof resourcesSettingsSchema>;

export const resourcesManifest: ModuleManifest<typeof resourcesSettingsSchema> = {
  id: 'resources',
  label: 'Recursos',
  mandatory: false,
  requires: [],
  settingsSchema: resourcesSettingsSchema,
  defaultSettings: { overallocationRedPct: 120, hoursPerDay: 8 },
  collections: [resources, allocations],
  constraints: {},
};
