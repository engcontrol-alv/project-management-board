import { z } from 'zod';
import type { MilestoneId, PartyId, WorkPackageId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const MILESTONE_TYPES = [
  'Interno',
  'Contratual',
  'Faturamento',
  'Teste (TAF/TAC/TAP/TDS)',
  'Outro',
] as const;

export const milestoneSchema = z
  .object({
    id: idSchema<MilestoneId>(),
    code: z.string(),
    name: requiredText('nome é obrigatório'),
    phase: z.string(),
    type: z.enum(MILESTONE_TYPES),
    /** Pacotes da EAP; o marco ocorre quando todos terminam. */
    predecessorIds: z.array(idSchema<WorkPackageId>()),
    manualDate: nullableIsoDate,
    actualDate: nullableIsoDate,
    ownerId: idSchema<PartyId>().nullable(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (m.predecessorIds.length === 0 && !m.manualDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['manualDate'],
        message: 'marco sem predecessores exige data manual',
      });
    }
  });

export type Milestone = z.infer<typeof milestoneSchema>;

export type ScheduleData = { milestones: Record<MilestoneId, Milestone> };

export function emptyScheduleData(): ScheduleData {
  return { milestones: {} };
}
