import { z } from 'zod';
import type { MilestoneId, PartyId, ProcurementId, WorkPackageId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';
import { amount, NATURES, rate } from './budget-line';

export const PROCUREMENT_TYPES = ['Produto', 'Serviço'] as const;
export const ORIGINS = ['Nacional', 'Importado'] as const;
export const CRITICALITY = ['Alta', 'Média', 'Baixa'] as const;
export const CONTRACT_STATUSES = ['A solicitar', 'Em cotação', 'Pedido emitido', 'Contratado', 'Cancelado'] as const;
export const PRODUCT_DELIVERY = [
  'Não iniciado',
  'Em produção',
  'Em trânsito',
  'Em desembaraço aduaneiro',
  'Recebido',
] as const;
export const SERVICE_DELIVERY = ['Não iniciado', 'Serviço em execução', 'Serviço concluído'] as const;
export const DELIVERY_STATUSES = [...PRODUCT_DELIVERY, 'Serviço em execução', 'Serviço concluído'] as const;

export function deliveryStatusesFor(type: string): readonly string[] {
  return type === 'Serviço' ? SERVICE_DELIVERY : PRODUCT_DELIVERY;
}

export const procurementSchema = z
  .object({
    id: idSchema<ProcurementId>(),
    code: z.string(),
    description: requiredText('descrição é obrigatória'),
    type: z.enum(PROCUREMENT_TYPES),
    nature: z.enum(NATURES),
    /** Organização com papel Fornecedor ou Prestador de serviço (obrigatória; checada na integridade). */
    supplierId: idSchema<PartyId>().nullable(),
    origin: z.enum(ORIGINS),
    country: z.string(),
    currency: z.string().min(3),
    rate,
    workPackageId: idSchema<WorkPackageId>().nullable(),
    milestoneId: idSchema<MilestoneId>().nullable(),
    criticality: z.enum(CRITICALITY),
    ownerId: idSchema<PartyId>().nullable(),
    budgetedCents: amount,
    committedCents: amount,
    actualCents: amount,
    contractStatus: z.enum(CONTRACT_STATUSES),
    deliveryStatus: z.enum(DELIVERY_STATUSES),
    requestDate: nullableIsoDate,
    dueDate: nullableIsoDate,
    completionDate: nullableIsoDate,
  })
  .strict()
  .superRefine((p, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (p.committedCents > 0 && p.contractStatus !== 'Pedido emitido' && p.contractStatus !== 'Contratado')
      issue('committedCents', 'comprometido exige pedido emitido ou contrato');
    if ((p.deliveryStatus === 'Recebido' || p.deliveryStatus === 'Serviço concluído') && !p.completionDate)
      issue('completionDate', 'Recebido exige a data de recebimento/conclusão');
    if (p.origin === 'Importado' && p.country.trim() === '') issue('country', 'informe o país de origem');
    if (!deliveryStatusesFor(p.type).includes(p.deliveryStatus))
      issue('deliveryStatus', `status de entrega incompatível com ${p.type.toLowerCase()}`);
  });

export type Procurement = z.infer<typeof procurementSchema>;
