import { z } from 'zod';
import type { PartyId, ResourceId } from '@/core/ids';
import { cents, idSchema, requiredText } from '@/shared/lib/zod';

export const RESOURCE_TYPES = ['Pessoa interna', 'Pessoa terceirizada', 'Equipe', 'Equipamento'] as const;
export const SKILL_LEVELS = ['Júnior', 'Pleno', 'Sênior', 'Especialista'] as const;

const PERSON_TYPES: readonly string[] = ['Pessoa interna', 'Pessoa terceirizada'];
const ORG_TYPES: readonly string[] = ['Pessoa terceirizada', 'Equipe'];

export const resourceSchema = z
  .object({
    id: idSchema<ResourceId>(),
    code: z.string(),
    name: requiredText('nome é obrigatório'),
    type: z.enum(RESOURCE_TYPES),
    role: z.string(),
    skill: z.string(),
    skillLevel: z.enum(SKILL_LEVELS).nullable(),
    capacityPct: z.number().int().min(1).max(100),
    /** D3: custo homem-hora na moeda base; o custo/dia é derivado com `hoursPerDay`. */
    hourlyRateCents: cents.min(0).nullable(),
    personId: idSchema<PartyId>().nullable(),
    organizationId: idSchema<PartyId>().nullable(),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.personId && !PERSON_TYPES.includes(r.type))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['personId'], message: 'pessoa só se aplica a recursos do tipo pessoa' });
    if (r.organizationId && !ORG_TYPES.includes(r.type))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['organizationId'],
        message: 'organização só se aplica a terceirizados e equipes',
      });
  });

export type Resource = z.infer<typeof resourceSchema>;

export function personAllowed(type: unknown): boolean {
  return PERSON_TYPES.includes(String(type));
}
export function organizationAllowed(type: unknown): boolean {
  return ORG_TYPES.includes(String(type));
}
