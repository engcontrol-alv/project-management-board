import { z } from 'zod';
import type { PartyId, WorkPackageId } from '@/core/ids';
import { idSchema, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export const WBS_KINDS = ['Agrupador', 'Pacote de trabalho'] as const;
export type WbsKind = (typeof WBS_KINDS)[number];

export const wbsNodeSchema = z
  .object({
    id: idSchema<WorkPackageId>(),
    code: z.string().regex(/^\d+(\.\d+){0,3}$/, { message: 'código da EAP inválido (até 4 níveis)' }),
    name: requiredText('nome é obrigatório'),
    parentId: idSchema<WorkPackageId>().nullable(),
    kind: z.enum(WBS_KINDS),
    duration: z
      .number()
      .int({ message: 'duração deve ser um número inteiro de dias' })
      .min(0, { message: 'duração não pode ser negativa' }),
    predecessorIds: z.array(idSchema<WorkPackageId>()),
    startNoEarlierThan: nullableIsoDate,
    actualStart: nullableIsoDate,
    actualFinish: nullableIsoDate,
    percentComplete: z.number().min(0).max(100),
    ownerId: idSchema<PartyId>().nullable(),
    phase: z.string(),
  })
  .strict()
  .superRefine((n, ctx) => {
    const issue = (path: string, message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (n.kind === 'Agrupador') {
      if (n.predecessorIds.length > 0) issue('predecessorIds', 'agrupador não tem predecessores');
      if (n.duration !== 0) issue('duration', 'agrupador não tem duração');
    }
    if (n.actualFinish && !n.actualStart) issue('actualFinish', 'término real exige início real');
    if (n.actualFinish && n.actualStart && n.actualFinish < n.actualStart)
      issue('actualFinish', 'término real não pode ser anterior ao início real');
    if (n.percentComplete === 100 && !n.actualFinish)
      issue('actualFinish', '% físico 100 exige término real');
    if (n.actualFinish && n.percentComplete !== 100)
      issue('percentComplete', 'com término real o % físico deve ser 100');
  });

export type WbsNode = z.infer<typeof wbsNodeSchema>;
