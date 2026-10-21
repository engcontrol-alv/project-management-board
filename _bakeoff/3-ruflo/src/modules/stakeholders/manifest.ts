import { z } from 'zod';
import type { CollectionDef, ModuleManifest } from '@/core/module-contract';
import { communicationSchema, type Communication } from './model/communication';
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
    {
      field: 'analysis.relationshipOwnerId',
      label: 'responsável pelo relacionamento',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isPerson',
    },
  ],
  describe: (p) => `${p.code} ${p.name}`.trim(),
};

const communications: CollectionDef<Communication> = {
  module: 'stakeholders',
  name: 'communications',
  table: 'stakeholders_communications',
  label: 'Plano de comunicação',
  cardinality: 'many',
  schema: communicationSchema,
  codePrefix: 'COM',
  refs: [
    {
      field: 'recipientIds',
      label: 'destinatários',
      target: { module: 'stakeholders', collection: 'parties' },
      many: true,
      required: false,
    },
    {
      field: 'ownerId',
      label: 'responsável',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isPerson',
    },
  ],
  describe: (c) => `${c.code} ${c.information}`.trim(),
};

const settingsSchema = z
  .object({
    /** Fornecedor com comprometido acima disso é destacado na matriz (centavos, moeda base). */
    supplierCommittedThresholdCents: z.number().int().min(0),
  })
  .strict();
export type StakeholdersSettings = z.infer<typeof settingsSchema>;

export const stakeholdersManifest: ModuleManifest<typeof settingsSchema> = {
  id: 'stakeholders',
  label: 'Partes Interessadas',
  mandatory: false,
  requires: [],
  settingsSchema,
  defaultSettings: { supplierCommittedThresholdCents: 10_000_000 },
  collections: [parties, communications],
  constraints: partyConstraints,
};
