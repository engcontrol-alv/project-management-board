import { z } from 'zod';
import type { ProjectId } from '@/core/ids';
import type { ModuleId } from '@/core/module-contract';
import type { IsoDate } from '@/shared/lib/dates';
import { idSchema, isoDate, nullableIsoDate, requiredText } from '@/shared/lib/zod';

export type ProjectConfig = {
  modules: { [K in ModuleId]?: { enabled: boolean; settings: unknown } };
};

export type ProjectInfo = { name: string; code: string; startDate: IsoDate };

export type Project = {
  id: ProjectId;
  schemaVersion: number;
  info: ProjectInfo;
  config: ProjectConfig;
  /** `null` = hoje. */
  statusDate: IsoDate | null;
  /** Por prefixo de código; nunca decresce. */
  counters: Record<string, number>;
  createdAt: string;
  updatedAt: string;
};

const moduleConfig = z.object({ enabled: z.boolean(), settings: z.unknown() }).strict().optional();

export const projectInfoSchema = z
  .object({
    name: requiredText('nome do projeto é obrigatório'),
    code: requiredText('código do projeto é obrigatório').pipe(
      z.string().max(12, { message: 'código do projeto deve ter até 12 caracteres' }),
    ),
    startDate: isoDate,
  })
  .strict();

export const projectSchema = z
  .object({
    id: idSchema<ProjectId>(),
    schemaVersion: z.number().int(),
    info: projectInfoSchema,
    config: z
      .object({
        modules: z
          .object({
            governance: moduleConfig,
            scope: moduleConfig,
            schedule: moduleConfig,
            finances: moduleConfig,
            risks: moduleConfig,
            resources: moduleConfig,
            stakeholders: moduleConfig,
          })
          .strict(),
      })
      .strict(),
    statusDate: nullableIsoDate,
    counters: z.record(z.number().int().min(0)),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .strict() as unknown as z.ZodType<Project, z.ZodTypeDef, unknown>;
