import { z } from 'zod';
import type { PartyId } from '@/core/ids';
import { idSchema, nullableIsoDate } from '@/shared/lib/zod';

export const PROJECT_STATUSES = [
  'Em iniciação',
  'Em execução',
  'Em encerramento',
  'Encerrado',
  'Suspenso',
] as const;
export const TEMPLATES = ['Interno', 'Externo (cliente)'] as const;
export const PROCUREMENT_MODELS = [
  'Compra direta',
  'Cotação com ≥ 3 fornecedores',
  'Concorrência',
  'Contrato-quadro',
  'Fornecedor indicado pelo cliente',
  'Outra',
] as const;
export const BILLING_MODES = ['Direto ao cliente', 'Próprio/Revenda', 'Misto'] as const;
export const SELECTION_CRITERIA = [
  'Preço',
  'Prazo',
  'Qualificação técnica',
  'Homologação do cliente',
  'Nacional/Importado',
  'Histórico',
] as const;

/** Cláusula contratual de multa por atraso (D7). */
export const PENALTY_PERIODS = ['Diário', 'Semanal'] as const;
export const PENALTY_BASES = ['Valor do contrato', 'Valor do marco'] as const;

const latePenaltySchema = z
  .object({
    enabled: z.boolean(),
    /** % do valor-base por período de atraso (0,1 = 0,1%). */
    ratePct: z.number().nullable(),
    period: z.enum(PENALTY_PERIODS),
    base: z.enum(PENALTY_BASES),
    /** Valor do contrato na moeda base. */
    contractValueCents: z.number().int({ message: 'valor deve estar em centavos inteiros' }).nullable(),
    /** Teto do total, em % do valor do contrato; `null` = sem teto. */
    capPct: z.number().nullable(),
    notes: z.string(),
  })
  .strict()
  .superRefine((c, ctx) => {
    if (!c.enabled) return;
    const issue = (path: string, message: string) => ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (c.ratePct === null || c.ratePct <= 0 || c.ratePct > 100) issue('ratePct', 'informe o percentual da multa por período');
    if ((c.base === 'Valor do contrato' || c.capPct !== null) && (c.contractValueCents === null || c.contractValueCents <= 0))
      issue('contractValueCents', 'informe o valor do contrato');
    if (c.capPct !== null && (c.capPct <= 0 || c.capPct > 100)) issue('capPct', 'teto deve ficar entre 0% e 100%');
  });

export const profileSchema = z
  .object({
    /** = projectId */
    id: z.string().min(1),
    charter: z
      .object({
        clientId: idSchema<PartyId>().nullable(),
        sponsorId: idSchema<PartyId>().nullable(),
        managerId: idSchema<PartyId>().nullable(),
        objective: z.string(),
        justification: z.string(),
        currentPhase: z.string(),
        status: z.enum(PROJECT_STATUSES),
        approvalDate: nullableIsoDate,
      })
      .strict(),
    closure: z
      .object({
        plannedDate: nullableIsoDate,
        actualDate: nullableIsoDate,
        pendingItems: z.string(),
        closureTermSigned: z.boolean(),
      })
      .strict(),
    documentTemplate: z
      .object({ template: z.enum(TEMPLATES).nullable(), notes: z.string() })
      .strict(),
    procurementPolicy: z
      .object({
        model: z.enum(PROCUREMENT_MODELS).nullable(),
        billing: z.enum(BILLING_MODES).nullable(),
        criteria: z.array(z.enum(SELECTION_CRITERIA)),
        approvalLimitCents: z
          .number()
          .int({ message: 'valor deve estar em centavos inteiros' })
          .nullable(),
        notes: z.string(),
      })
      .strict(),
    latePenalty: latePenaltySchema,
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.charter.status !== 'Encerrado') return;
    const issue = (path: string[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message });
    if (!p.closure.closureTermSigned)
      issue(['closure', 'closureTermSigned'], 'projeto encerrado exige termo de encerramento assinado');
    if (!p.closure.actualDate)
      issue(['closure', 'actualDate'], 'projeto encerrado exige data real de encerramento');
    if (p.closure.pendingItems.trim() !== '')
      issue(['closure', 'pendingItems'], 'projeto encerrado não pode ter pendências');
  });

export type GovernanceProfile = z.infer<typeof profileSchema>;

export function emptyProfile(projectId: string): GovernanceProfile {
  return {
    id: projectId,
    charter: {
      clientId: null,
      sponsorId: null,
      managerId: null,
      objective: '',
      justification: '',
      currentPhase: '',
      status: 'Em iniciação',
      approvalDate: null,
    },
    closure: { plannedDate: null, actualDate: null, pendingItems: '', closureTermSigned: false },
    documentTemplate: { template: null, notes: '' },
    procurementPolicy: { model: null, billing: null, criteria: [], approvalLimitCents: null, notes: '' },
    latePenalty: emptyLatePenalty(),
  };
}

export function emptyLatePenalty(): GovernanceProfile['latePenalty'] {
  return {
    enabled: false,
    ratePct: null,
    period: 'Diário',
    base: 'Valor do contrato',
    contractValueCents: null,
    capPct: null,
    notes: '',
  };
}
