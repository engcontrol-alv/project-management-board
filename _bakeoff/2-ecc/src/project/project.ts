import { z } from 'zod';
import type { ProjectId } from '@/core/ids';
import { MODULE_IDS } from '@/core/module-contract';
import { brandedId, isoDate } from '@/shared/lib/zod';

export const projectInfoSchema = z
  .object({
    name: z.string().trim().min(1),
    code: z.string().trim().min(1).max(12, 'código com no máximo 12 caracteres'),
    startDate: isoDate,
  })
  .strict();
export type ProjectInfo = z.infer<typeof projectInfoSchema>;

const moduleConfigSchema = z.object({ enabled: z.boolean(), settings: z.unknown() }).strict();

export const projectConfigSchema = z
  .object({ modules: z.object(Object.fromEntries(MODULE_IDS.map((id) => [id, moduleConfigSchema.optional()]))) })
  .strict();

export type ModuleConfig = { enabled: boolean; settings: unknown };
export type ProjectConfig = { modules: { [K in (typeof MODULE_IDS)[number]]?: ModuleConfig } };

export const projectSchema = z
  .object({
    id: brandedId<ProjectId>(),
    schemaVersion: z.number().int().min(1),
    info: projectInfoSchema,
    config: projectConfigSchema as unknown as z.ZodType<ProjectConfig, z.ZodTypeDef, unknown>,
    statusDate: isoDate.nullable(),
    counters: z.record(z.number().int().min(0)),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict();

export type Project = z.infer<typeof projectSchema>;
