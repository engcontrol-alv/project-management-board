import { z } from 'zod';
import type { DeliverableId, PartyId, RequirementId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const REQ_CATEGORIES = [
  'Funcional',
  'Técnico',
  'Regulatório/Normativo',
  'Comercial/Contratual',
  'Qualidade',
  'Outro',
] as const;
export const REQ_ORIGINS = ['Cliente', 'Comercial', 'Normativo/Regulatório', 'Interno', 'Outro'] as const;
export const PRIORITIES = ['Alta', 'Média', 'Baixa'] as const;
export const VALIDATION_STATUSES = ['Não validado', 'Em validação', 'Validado'] as const;
export const FULFILLMENT_STATUSES = [
  'Não iniciado',
  'Em desenvolvimento',
  'Atendido',
  'Não atendido (gap)',
] as const;

export const requirementSchema = z
  .object({
    id: idSchema<RequirementId>(),
    code: z.string(),
    description: requiredText('descrição é obrigatória'),
    category: z.enum(REQ_CATEGORIES),
    origin: z.enum(REQ_ORIGINS),
    priority: z.enum(PRIORITIES),
    validationStatus: z.enum(VALIDATION_STATUSES),
    fulfillmentStatus: z.enum(FULFILLMENT_STATUSES),
    acceptanceCriteria: z.string(),
    ownerId: idSchema<PartyId>().nullable(),
    lastValidation: nullableIsoDate,
    deliverableIds: z.array(idSchema<DeliverableId>()),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.validationStatus === 'Validado' && !r.lastValidation) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['lastValidation'],
        message: 'requisito validado exige a data da última validação',
      });
    }
  });

export type Requirement = z.infer<typeof requirementSchema>;
