import { z } from 'zod';
import type { BudgetLineId, MilestoneId, PartyId, WorkPackageId } from '@/core/ids';
import { cents, idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const ITEM_KINDS = ['Custo', 'Receita'] as const;
export const NATURES = ['CAPEX', 'OPEX'] as const;
export type Nature = (typeof NATURES)[number];
export const BUDGET_CATEGORIES = [
  'Mão de obra',
  'Logística',
  'Marco contratual/Faturamento',
  'Contingência',
  'Outro',
] as const;
export const BUDGET_STATUSES = ['Planejado', 'Em andamento', 'Realizado', 'Em disputa', 'Cancelado'] as const;

/** Valor monetário não negativo, em centavos da moeda do item. */
export const amount = cents.min(0, { message: 'valor não pode ser negativo' });
/** Taxa para a moeda base; obrigatória quando a moeda difere da base (validado com os settings). */
export const rate = z.number().positive({ message: 'taxa deve ser maior que zero' }).nullable();

export const budgetLineSchema = z
  .object({
    id: idSchema<BudgetLineId>(),
    code: z.string(),
    description: requiredText('descrição é obrigatória'),
    kind: z.enum(ITEM_KINDS),
    nature: z.enum(NATURES),
    category: z.enum(BUDGET_CATEGORIES),
    currency: z.string().min(3),
    rate,
    budgetedCents: amount,
    actualCents: amount,
    plannedDate: nullableIsoDate,
    actualDate: nullableIsoDate,
    status: z.enum(BUDGET_STATUSES),
    workPackageId: idSchema<WorkPackageId>().nullable(),
    milestoneId: idSchema<MilestoneId>().nullable(),
    partyId: idSchema<PartyId>().nullable(),
    ownerId: idSchema<PartyId>().nullable(),
  })
  .strict()
  .superRefine((l, ctx) => {
    if (l.status === 'Realizado' && (l.actualCents <= 0 || !l.actualDate))
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['actualDate'],
        message: 'Realizado exige valor e data reais',
      });
  });

export type BudgetLine = z.infer<typeof budgetLineSchema>;
