import { z } from 'zod';
import type { ChangeRequestId, DeliverableId, PartyId, WorkPackageId } from '@/core/ids';
import { idSchema, isoDate, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const CR_STATUSES = [
  'Solicitada',
  'Em análise',
  'Aprovada',
  'Rejeitada',
  'Implementada',
  'Cancelada',
] as const;
export type CrStatus = (typeof CR_STATUSES)[number];

export const CR_CATEGORIES = [
  'Escopo',
  'Cronograma',
  'Custo',
  'Qualidade',
  'Contratual',
  'Técnica',
] as const;
export const IMPACT_LEVELS = ['Baixo', 'Médio', 'Alto'] as const;

const DECIDED: readonly CrStatus[] = ['Aprovada', 'Rejeitada', 'Implementada'];

export const changeRequestSchema = z
  .object({
    id: idSchema<ChangeRequestId>(),
    code: z.string(),
    title: requiredText('título é obrigatório'),
    description: z.string(),
    justification: z.string(),
    requesterId: idSchema<PartyId>().nullable(),
    requestDate: isoDate,
    categories: z.array(z.enum(CR_CATEGORIES)),
    scopeImpact: z.string(),
    affectedWorkPackageIds: z.array(idSchema<WorkPackageId>()),
    affectedDeliverableIds: z.array(idSchema<DeliverableId>()),
    /** Negativo = antecipação. */
    scheduleImpactDays: z.number().int({ message: 'deve ser um número inteiro de dias' }).nullable(),
    /** Negativo = economia. */
    costImpactCents: z.number().int({ message: 'valor deve estar em centavos inteiros' }).nullable(),
    impactLevel: z.enum(IMPACT_LEVELS).nullable(),
    status: z.enum(CR_STATUSES),
    approverId: idSchema<PartyId>().nullable(),
    decisionDate: nullableIsoDate,
    implementerId: idSchema<PartyId>().nullable(),
  })
  .strict()
  .superRefine((cr, ctx) => {
    if (!DECIDED.includes(cr.status)) return;
    if (!cr.approverId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['approverId'],
        message: `mudança ${cr.status.toLowerCase()} exige aprovador`,
      });
    if (!cr.decisionDate)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['decisionDate'],
        message: `mudança ${cr.status.toLowerCase()} exige data da decisão`,
      });
  });

export type ChangeRequest = z.infer<typeof changeRequestSchema>;
