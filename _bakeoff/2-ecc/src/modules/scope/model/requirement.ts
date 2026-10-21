import { z } from 'zod';
import type { DeliverableId, PartyId, RequirementId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

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
export const FULFILLMENT_STATUSES = ['Não iniciado', 'Em desenvolvimento', 'Atendido', 'Não atendido (gap)'] as const;

export const requirementSchema = z
  .object({
    id: brandedId<RequirementId>(),
    code: z.string().min(1),
    description: z.string().trim().min(1, 'descrição é obrigatória'),
    category: z.enum(REQ_CATEGORIES),
    origin: z.enum(REQ_ORIGINS),
    priority: z.enum(PRIORITIES),
    validationStatus: z.enum(VALIDATION_STATUSES),
    fulfillmentStatus: z.enum(FULFILLMENT_STATUSES),
    acceptanceCriteria: z.string(),
    ownerId: brandedId<PartyId>().nullable(),
    lastValidation: isoDate.nullable(),
    deliverableIds: z.array(brandedId<DeliverableId>()),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.validationStatus === 'Validado' && !r.lastValidation) {
      ctx.addIssue({ code: 'custom', path: ['lastValidation'], message: 'Validado exige a data da última validação' });
    }
  });

export type Requirement = z.infer<typeof requirementSchema>;
