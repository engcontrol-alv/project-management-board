import { z } from 'zod';
import type { DeliverableId, MilestoneId, PartyId, ProcurementId, RiskId, WorkPackageId } from '@/core/ids';
import { cents, idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const RISK_NATURES = ['Ameaça', 'Oportunidade'] as const;
export const THREAT_RESPONSES = ['Evitar', 'Mitigar', 'Transferir', 'Aceitar', 'Escalar'] as const;
export const OPPORTUNITY_RESPONSES = ['Explorar', 'Melhorar', 'Compartilhar', 'Aceitar', 'Escalar'] as const;
export const RESPONSE_TYPES = ['Evitar', 'Mitigar', 'Transferir', 'Aceitar', 'Escalar', 'Explorar', 'Melhorar', 'Compartilhar'] as const;
export const RISK_STATUSES =['Identificado', 'Em monitoramento', 'Em mitigação', 'Materializado', 'Encerrado'] as const;

/** Níveis da matriz 3×3 (D2: 5×5 fica para depois). */
export const LEVELS_3 = [1, 2, 3] as const;
export const PROBABILITY_LABELS: Record<number, string> = { 1: 'Baixa', 2: 'Média', 3: 'Alta' };
export const IMPACT_LABELS: Record<number, string> = { 1: 'Baixo', 2: 'Médio', 3: 'Alto' };

export function responsesFor(nature: string): readonly string[] {
  return nature === 'Oportunidade' ? OPPORTUNITY_RESPONSES : THREAT_RESPONSES;
}

const level = z.union([z.literal(1), z.literal(2), z.literal(3)]).nullable();

export const riskSchema = z
  .object({
    id: idSchema<RiskId>(),
    code: z.string(),
    title: requiredText('título é obrigatório'),
    nature: z.enum(RISK_NATURES),
    /** Validada contra a lista configurável (settings) no comando. */
    category: requiredText('categoria é obrigatória'),
    description: z.string(),
    rootCause: z.string(),
    probability: level,
    impact: level,
    responseType: z.enum(RESPONSE_TYPES).nullable(),
    responseAction: z.string(),
    ownerId: idSchema<PartyId>().nullable(),
    status: z.enum(RISK_STATUSES),
    nextReview: nullableIsoDate,
    notes: z.string(),
    probabilityPct: z.number().min(0).max(100).nullable(),
    costImpactCents: cents.nullable(),
    scheduleImpactDays: z.number().int().nullable(),
    workPackageIds: z.array(idSchema<WorkPackageId>()),
    milestoneIds: z.array(idSchema<MilestoneId>()),
    deliverableIds: z.array(idSchema<DeliverableId>()),
    procurementIds: z.array(idSchema<ProcurementId>()),
    partyIds: z.array(idSchema<PartyId>()),
  })
  .strict()
  .superRefine((r, ctx) => {
    if (r.responseType && !responsesFor(r.nature).includes(r.responseType))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['responseType'],
        message: `resposta "${r.responseType}" não se aplica a ${r.nature.toLowerCase()}`,
      });
    if (r.status === 'Em mitigação' && (!r.responseType || r.responseAction.trim() === ''))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['responseAction'],
        message: 'Em mitigação exige tipo de resposta e ação',
      });
  });

export type Risk = z.infer<typeof riskSchema>;
