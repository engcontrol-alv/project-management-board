import { z } from 'zod';
import type { PartyId } from '@/core/ids';
import { idSchema, requiredText } from '@/shared/lib/zod';

export const ORG_ROLES = [
  'Cliente',
  'Fornecedor',
  'Prestador de serviço',
  'Parceiro',
  'Órgão regulador/certificador',
  'Concessionária',
  'Outro',
] as const;
export type OrgRole = (typeof ORG_ROLES)[number];

export const INTERNAL_OPTIONS = ['Interno', 'Externo'] as const;
export const PARTY_KINDS = ['Pessoa', 'Organização'] as const;

/** Valida um CNPJ (somente dígitos). */
export function isValidCnpj(digits: string): boolean {
  if (!/^\d{14}$/.test(digits) || /^(\d)\1{13}$/.test(digits)) return false;
  const nums = digits.split('').map(Number);
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * (nums[i] ?? 0), 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === nums[12] && check(13) === nums[13];
}

const partyId = idSchema<PartyId>();

const common = {
  id: partyId,
  code: z.string(),
  name: requiredText('nome é obrigatório'),
  contact: z.string(),
  internal: z.enum(INTERNAL_OPTIONS),
  notes: z.string(),
};

export const personSchema = z
  .object({
    ...common,
    kind: z.literal('Pessoa'),
    position: z.string(),
    organizationId: partyId.nullable(),
  })
  .strict();

export const organizationSchema = z
  .object({
    ...common,
    kind: z.literal('Organização'),
    roles: z.array(z.enum(ORG_ROLES)).min(1, { message: 'informe ao menos um papel' }),
    taxId: z.string().refine((v) => v === '' || isValidCnpj(v.replace(/\D/g, '')), {
      message: 'CNPJ inválido',
    }),
    country: z.string(),
  })
  .strict();

export const partySchema = z.discriminatedUnion('kind', [personSchema, organizationSchema]);

export type Person = z.infer<typeof personSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Party = Person | Organization;

export type StakeholdersData = { parties: Record<PartyId, Party> };

export function emptyStakeholdersData(): StakeholdersData {
  return { parties: {} };
}

function asParty(t: unknown): Party | null {
  return t && typeof t === 'object' && 'kind' in t ? (t as Party) : null;
}

export const partyConstraints = {
  isPerson: (t: unknown) => (asParty(t)?.kind === 'Pessoa' ? null : 'deve ser uma pessoa'),
  isOrganization: (t: unknown) =>
    asParty(t)?.kind === 'Organização' ? null : 'deve ser uma organização',
  isClientOrganization: (t: unknown) => {
    const p = asParty(t);
    return p?.kind === 'Organização' && p.roles.includes('Cliente')
      ? null
      : 'deve ser uma organização com papel Cliente';
  },
  isSupplierOrganization: (t: unknown) => {
    const p = asParty(t);
    return p?.kind === 'Organização' &&
      (p.roles.includes('Fornecedor') || p.roles.includes('Prestador de serviço'))
      ? null
      : 'deve ser uma organização com papel Fornecedor ou Prestador de serviço';
  },
};
