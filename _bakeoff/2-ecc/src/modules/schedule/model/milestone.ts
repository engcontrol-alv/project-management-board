import { z } from 'zod';
import type { MilestoneId, PartyId, WorkPackageId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

export const MILESTONE_TYPES = ['Interno', 'Contratual', 'Faturamento', 'Teste (TAF/TAC/TAP/TDS)', 'Outro'] as const;

export const milestoneSchema = z
  .object({
    id: brandedId<MilestoneId>(),
    code: z.string().min(1),
    name: z.string().trim().min(1),
    phase: z.string(),
    type: z.enum(MILESTONE_TYPES),
    predecessorIds: z.array(brandedId<WorkPackageId>()),
    manualDate: isoDate.nullable(),
    actualDate: isoDate.nullable(),
    ownerId: brandedId<PartyId>().nullable(),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (!m.predecessorIds.length && !m.manualDate) {
      ctx.addIssue({ code: 'custom', path: ['manualDate'], message: 'marco sem predecessores exige data manual' });
    }
  });

export type Milestone = z.infer<typeof milestoneSchema>;

export type ScheduleData = { milestones: Record<MilestoneId, Milestone> };

export function emptyScheduleData(): ScheduleData {
  return { milestones: {} };
}
