import { z } from 'zod';
import type { DeliverableId, MilestoneId, PartyId, ProcurementId, RiskId, WorkPackageId } from '@/core/ids';
import { cents, idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const RISK_NATURES = ['Ameaça', 'Oportunidade'] as const;
export const THREAT_RESPONSES = ['Evitar', 'Mitigar', 'Transferir', 'Aceitar', 'Escalar'] as const;
export const OPPORTUNITY_RESPONSES = ['Explorar', 'Melhorar', 'Compartilhar', 'Aceitar', 'Escalar'] as const;
export const RESPONSE_TYPES = ['Evitar', 'Mitigar', 'Transferir', 'Aceitar', 'Escalar', 'Explorar', 'Melhorar', 'Compartilhar'] as const;
export const RISK_STATUSES =['Identificado', 'Em monitoramento', 'Em mitigação', 'Materializado', 'Encerrado'] as const;

/** Tamanho da matriz P × I (SPEC §8.4): 3×3 padrão, configurável para 5×5. */
export const RISK_SCALES = [3, 5] as const;
export type RiskScale = (typeof RISK_SCALES)[number];

export function levelsFor(scale: RiskScale): number[] {
  return Array.from({ length: scale }, (_, i) => i + 1);
}

const LABELS: Record<RiskScale, { probability: string[]; impact: string[] }> = {
  3: { probability: ['Baixa', 'Média', 'Alta'], impact: ['Baixo', 'Médio', 'Alto'] },
  5: {
    probability: ['Muito baixa', 'Baixa', 'Média', 'Alta', 'Muito alta'],
    impact: ['Muito baixo', 'Baixo', 'Médio', 'Alto', 'Muito alto'],
  },
};

/** Rótulos por nível (índice 0 = nível 1). */
export function levelLabels(scale: RiskScale): { probability: string[]; impact: string[] } {
  return LABELS[scale];
}

export function responsesFor(nature: string): readonly string[] {
  return nature === 'Oportunidade' ? OPPORTUNITY_RESPONSES : THREAT_RESPONSES;
}

/** Nível 1–5; o limite da escala do projeto é validado com os settings (integridade). */
const level = z.number().int().min(1).max(5).nullable();

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
    /** "Reavaliar" (D1): avaliação anterior à troca de escala; volta exata se a escala voltar. */
    reassess: z
      .object({ scale: z.union([z.literal(3), z.literal(5)]), probability: z.number().int().min(1).max(5), impact: z.number().int().min(1).max(5) })
      .strict()
      .nullable(),
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
