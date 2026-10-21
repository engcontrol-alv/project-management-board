import { z } from 'zod';
import type { PartyId, ProjectId } from '@/core/ids';
import { brandedId, cents, isoDate } from '@/shared/lib/zod';

export const PROJECT_STATUSES = ['Em iniciação', 'Em execução', 'Em encerramento', 'Encerrado', 'Suspenso'] as const;
export const DOC_TEMPLATE_OPTIONS = ['Interno', 'Externo (cliente)'] as const;
export const PROCUREMENT_MODELS = [
  'Compra direta',
  'Cotação com ≥ 3 fornecedores',
  'Concorrência',
  'Contrato-quadro',
  'Fornecedor indicado pelo cliente',
  'Outra',
] as const;
export const BILLING_OPTIONS = ['Direto ao cliente', 'Próprio/Revenda', 'Misto'] as const;
export const SELECTION_CRITERIA = [
  'Preço',
  'Prazo',
  'Qualificação técnica',
  'Homologação do cliente',
  'Nacional/Importado',
  'Histórico',
] as const;

export const profileSchema = z
  .object({
    id: z.string().min(1),
    charter: z
      .object({
        clientId: brandedId<PartyId>().nullable(),
        sponsorId: brandedId<PartyId>().nullable(),
        managerId: brandedId<PartyId>().nullable(),
        objective: z.string(),
        justification: z.string(),
        currentPhase: z.string(),
        status: z.enum(PROJECT_STATUSES),
        approvalDate: isoDate.nullable(),
      })
      .strict(),
    closure: z
      .object({
        plannedDate: isoDate.nullable(),
        actualDate: isoDate.nullable(),
        pendingItems: z.string(),
        closureTermSigned: z.boolean(),
      })
      .strict(),
    documentTemplate: z.object({ template: z.enum(DOC_TEMPLATE_OPTIONS).nullable(), notes: z.string() }).strict(),
    procurementPolicy: z
      .object({
        model: z.enum(PROCUREMENT_MODELS).nullable(),
        billing: z.enum(BILLING_OPTIONS).nullable(),
        criteria: z.array(z.enum(SELECTION_CRITERIA)),
        approvalLimitCents: cents.nullable(),
        notes: z.string(),
      })
      .strict(),
  })
  .strict()
  .superRefine((p, ctx) => {
    if (p.charter.status !== 'Encerrado') return;
    const issue = (path: string[], message: string) => ctx.addIssue({ code: 'custom', path, message });
    if (!p.closure.closureTermSigned)
      issue(['closure', 'closureTermSigned'], 'Encerrado exige termo de encerramento assinado');
    if (!p.closure.actualDate) issue(['closure', 'actualDate'], 'Encerrado exige data real de encerramento');
    if (p.closure.pendingItems.trim())
      issue(['closure', 'pendingItems'], 'Encerrado exige pendências contratuais/financeiras vazias');
  });

export type GovernanceProfile = z.infer<typeof profileSchema>;

export function emptyProfile(projectId: ProjectId): GovernanceProfile {
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
  };
}
