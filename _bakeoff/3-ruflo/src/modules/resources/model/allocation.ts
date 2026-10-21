import { z } from 'zod';
import type { AllocationId, ResourceId, WorkPackageId } from '@/core/ids';
import { idSchema, isoDate } from '@/shared/lib/zod';

export const ALLOCATION_STATUSES = ['Planejada', 'Ativa', 'Encerrada'] as const;

export const allocationSchema = z
  .object({
    id: idSchema<AllocationId>(),
    code: z.string(),
    resourceId: idSchema<ResourceId>().nullable(),
    workPackageId: idSchema<WorkPackageId>().nullable(),
    pct: z.number().int().min(1).max(100),
    start: isoDate,
    finish: isoDate,
    status: z.enum(ALLOCATION_STATUSES),
  })
  .strict()
  .superRefine((a, ctx) => {
    if (a.finish < a.start)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['finish'],
        message: 'término deve ser igual ou posterior ao início',
      });
  });

export type Allocation = z.infer<typeof allocationSchema>;
