import { z } from 'zod';
import type { PartyId, WorkPackageId } from '@/core/ids';
import { brandedId, isoDate } from '@/shared/lib/zod';

export const WBS_KINDS = ['Agrupador', 'Pacote de trabalho'] as const;

export const wbsNodeSchema = z
  .object({
    id: brandedId<WorkPackageId>(),
    code: z.string().min(1),
    name: z.string().trim().min(1),
    parentId: brandedId<WorkPackageId>().nullable(),
    kind: z.enum(WBS_KINDS),
    duration: z.number().int('duração deve ser inteira').min(0, 'duração não pode ser negativa'),
    predecessorIds: z.array(brandedId<WorkPackageId>()),
    startNoEarlierThan: isoDate.nullable(),
    actualStart: isoDate.nullable(),
    actualFinish: isoDate.nullable(),
    percentComplete: z.number().min(0).max(100),
    ownerId: brandedId<PartyId>().nullable(),
    phase: z.string(),
  })
  .strict()
  .superRefine((n, ctx) => {
    const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message });
    if (n.kind === 'Agrupador') {
      if (n.predecessorIds.length) issue('predecessorIds', 'agrupador não tem predecessores');
      if (n.duration !== 0) issue('duration', 'agrupador não tem duração');
      return;
    }
    if (n.actualFinish && !n.actualStart) issue('actualFinish', 'término real exige início real');
    if (n.actualFinish && n.actualStart && n.actualFinish < n.actualStart)
      issue('actualFinish', 'término real não pode ser anterior ao início real');
    if (n.percentComplete === 100 && !n.actualFinish) issue('percentComplete', '100% exige término real');
    if (n.actualFinish && n.percentComplete !== 100) issue('percentComplete', 'término real exige 100%');
    if (n.predecessorIds.includes(n.id)) issue('predecessorIds', 'pacote não pode ser predecessor de si mesmo');
  });

export type WbsNode = z.infer<typeof wbsNodeSchema>;
