import { z } from 'zod';
import type { ChangeRequestId, ProjectId } from '@/core/ids';
import { brandedId, cents, isoDate } from '@/shared/lib/zod';

export const baselineSchema = z
  .object({
    id: z.string().min(1),
    projectId: brandedId<ProjectId>(),
    version: z.number().int().min(1),
    createdAt: z.string(),
    changeRequestId: brandedId<ChangeRequestId>().nullable(),
    projectFinish: isoDate.nullable(),
    workPackages: z.record(
      z.object({ start: isoDate, finish: isoDate, duration: z.number().int().min(0) }).strict(),
    ),
    milestones: z.record(z.object({ date: isoDate }).strict()),
    costItems: z.record(z.object({ budgetedCents: cents, currency: z.string(), rate: z.number() }).strict()),
    deliverables: z.record(
      z.object({ code: z.string(), name: z.string(), plannedDate: isoDate.nullable() }).strict(),
    ),
  })
  .strict();

export type Baseline = z.infer<typeof baselineSchema>;
