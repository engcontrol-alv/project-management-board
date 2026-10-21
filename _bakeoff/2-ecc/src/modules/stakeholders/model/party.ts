import { z } from 'zod';
import type { PartyId } from '@/core/ids';
import { brandedId } from '@/shared/lib/zod';

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

export const PARTY_KINDS = ['Pessoa', 'Organização'] as const;
export const INTERNAL_OPTIONS = ['Interno', 'Externo'] as const;

export function isValidCnpj(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  if (digits.length !== 14 || /^(\d)\1+$/.test(digits)) return false;
  const nums = [...digits].map(Number);
  const check = (len: number) => {
    const weights = len === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum = weights.reduce((acc, w, i) => acc + w * nums[i]!, 0);
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };
  return check(12) === nums[12] && check(13) === nums[13];
}

const common = {
  id: brandedId<PartyId>(),
  code: z.string().min(1),
  name: z.string().trim().min(1),
  contact: z.string(),
  internal: z.enum(INTERNAL_OPTIONS),
  notes: z.string(),
};

export const personSchema = z
  .object({
    ...common,
    kind: z.literal('Pessoa'),
    position: z.string(),
    organizationId: brandedId<PartyId>().nullable(),
  })
  .strict();

export const organizationSchema = z
  .object({
    ...common,
    kind: z.literal('Organização'),
    roles: z.array(z.enum(ORG_ROLES)).min(1, 'informe ao menos um papel'),
    taxId: z.string().refine((v) => v === '' || isValidCnpj(v), 'CNPJ inválido'),
    country: z.string(),
  })
  .strict();

export const partySchema = z.discriminatedUnion('kind', [personSchema, organizationSchema]);

export type Person = z.infer<typeof personSchema>;
export type Organization = z.infer<typeof organizationSchema>;
export type Party = z.infer<typeof partySchema>;

export type StakeholdersData = { parties: Record<PartyId, Party> };

export function emptyStakeholdersData(): StakeholdersData {
  return { parties: {} };
}
