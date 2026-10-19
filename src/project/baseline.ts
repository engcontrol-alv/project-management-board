import { z } from 'zod';
import type { ChangeRequestId, DeliverableId, MilestoneId, ProjectId, WorkPackageId } from '@/core/ids';
import type { IsoDate } from '@/shared/lib/dates';
import { isoDate, nullableIsoDate } from '@/shared/lib/zod';

export type Baseline = {
  id: string;
  projectId: ProjectId;
  version: number;
  createdAt: string;
  /** `null` só na v1. */
  changeRequestId: ChangeRequestId | null;
  projectFinish: IsoDate | null;
  workPackages: Record<WorkPackageId, { start: IsoDate; finish: IsoDate; duration: number }>;
  milestones: Record<MilestoneId, { date: IsoDate }>;
  /** Linhas de orçamento e contratações (Etapa 2). */
  costItems: Record<string, { budgetedCents: number; currency: string; rate: number }>;
  deliverables: Record<DeliverableId, { code: string; name: string; plannedDate: IsoDate | null }>;
};

export const baselineSchema = z
  .object({
    id: z.string().min(1),
    projectId: z.string().min(1),
    version: z.number().int().min(1),
    createdAt: z.string(),
    changeRequestId: z.string().min(1).nullable(),
    projectFinish: nullableIsoDate,
    workPackages: z.record(
      z.object({ start: isoDate, finish: isoDate, duration: z.number().int().min(0) }).strict(),
    ),
    milestones: z.record(z.object({ date: isoDate }).strict()),
    costItems: z.record(
      z.object({ budgetedCents: z.number().int(), currency: z.string(), rate: z.number() }).strict(),
    ),
    deliverables: z.record(
      z.object({ code: z.string(), name: z.string(), plannedDate: nullableIsoDate }).strict(),
    ),
  })
  .strict() as unknown as z.ZodType<Baseline, z.ZodTypeDef, unknown>;
