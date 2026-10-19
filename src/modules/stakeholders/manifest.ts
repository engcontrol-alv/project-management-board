import { z } from 'zod';
import type { CollectionDef, ModuleManifest } from '@/core/module-contract';
import { partyConstraints, partySchema, type Party } from './model/party';

const parties: CollectionDef<Party> = {
  module: 'stakeholders',
  name: 'parties',
  table: 'stakeholders_parties',
  label: 'Pessoas e organizações',
  cardinality: 'many',
  schema: partySchema,
  codePrefix: 'PI',
  refs: [
    {
      field: 'organizationId',
      label: 'organização',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isOrganization',
    },
  ],
  describe: (p) => `${p.code} ${p.name}`.trim(),
};

const settingsSchema = z.object({});

export const stakeholdersManifest: ModuleManifest<typeof settingsSchema> = {
  id: 'stakeholders',
  label: 'Partes Interessadas',
  mandatory: false,
  requires: [],
  settingsSchema,
  defaultSettings: {},
  collections: [parties],
  constraints: partyConstraints,
};
