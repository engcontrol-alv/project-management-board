import { z } from 'zod';
import type { CollectionDef, ModuleManifest } from '@/core/module-contract';
import { partySchema, type Party, type OrgRole } from './model/party';

function asParty(target: unknown): Party | null {
  return target && typeof target === 'object' && 'kind' in target ? (target as Party) : null;
}

function orgWithRole(target: unknown, roles: OrgRole[]): boolean {
  const p = asParty(target);
  return p?.kind === 'Organização' && p.roles.some((r) => roles.includes(r));
}

export const partiesCollection: CollectionDef<Party> = {
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
  describe: (p) => `${p.code} ${p.name}`,
};

export const stakeholdersManifest: ModuleManifest<z.ZodObject<Record<string, never>>> = {
  id: 'stakeholders',
  label: 'Partes Interessadas',
  mandatory: false,
  requires: [],
  settingsSchema: z.object({}),
  defaultSettings: {},
  collections: [partiesCollection as CollectionDef],
  constraints: {
    isPerson: (t) => (asParty(t)?.kind === 'Pessoa' ? null : 'deve ser uma pessoa'),
    isOrganization: (t) => (asParty(t)?.kind === 'Organização' ? null : 'deve ser uma organização'),
    isClientOrganization: (t) =>
      orgWithRole(t, ['Cliente']) ? null : 'deve ser uma organização com papel Cliente',
    isSupplierOrganization: (t) =>
      orgWithRole(t, ['Fornecedor', 'Prestador de serviço'])
        ? null
        : 'deve ser uma organização com papel Fornecedor ou Prestador de serviço',
  },
};
