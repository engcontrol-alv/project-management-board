import { z } from 'zod';
import type { ChangeRequestId, DeliverableId, PartyId, WorkPackageId } from '@/core/ids';
import { brandedId, cents, isoDate } from '@/shared/lib/zod';

export const CR_STATUSES = ['Solicitada', 'Em análise', 'Aprovada', 'Rejeitada', 'Implementada', 'Cancelada'] as const;
export type CrStatus = (typeof CR_STATUSES)[number];
export const CR_CATEGORIES = ['Escopo', 'Cronograma', 'Custo', 'Qualidade', 'Contratual', 'Técnica'] as const;
export const IMPACT_LEVELS = ['Baixo', 'Médio', 'Alto'] as const;

const DECIDED: CrStatus[] = ['Aprovada', 'Rejeitada', 'Implementada'];

export const changeRequestSchema = z
  .object({
    id: brandedId<ChangeRequestId>(),
    code: z.string().min(1),
    title: z.string().trim().min(1),
    description: z.string(),
    justification: z.string(),
    requesterId: brandedId<PartyId>().nullable(),
    requestDate: isoDate,
    categories: z.array(z.enum(CR_CATEGORIES)),
    scopeImpact: z.string(),
    affectedWorkPackageIds: z.array(brandedId<WorkPackageId>()),
    affectedDeliverableIds: z.array(brandedId<DeliverableId>()),
    scheduleImpactDays: z.number().int('impacto em prazo deve ser inteiro').nullable(),
    costImpactCents: cents.nullable(),
    impactLevel: z.enum(IMPACT_LEVELS).nullable(),
    status: z.enum(CR_STATUSES),
    approverId: brandedId<PartyId>().nullable(),
    decisionDate: isoDate.nullable(),
    implementerId: brandedId<PartyId>().nullable(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!DECIDED.includes(c.status)) return;
    if (!c.approverId)
      ctx.addIssue({ code: 'custom', path: ['approverId'], message: `${c.status} exige aprovador` });
    if (!c.decisionDate)
      ctx.addIssue({ code: 'custom', path: ['decisionDate'], message: `${c.status} exige data da decisão` });
  });

export type ChangeRequest = z.infer<typeof changeRequestSchema>;
