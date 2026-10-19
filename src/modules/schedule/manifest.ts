import { z } from 'zod';
import type { CollectionDef, ModuleManifest } from '@/core/module-contract';
import { milestoneSchema, type Milestone } from './model/milestone';

export const DEFAULT_PHASES = [
  'Conceituação',
  'Análise',
  'Planejamento de Gestão',
  'Planejamento de Engenharia',
  'Execução',
  'Diligenciamento',
  'Testes',
  'Validação',
  'Serviços',
  'Faturamento',
  'Pagamento',
  'Expedição',
  'Garantia',
];

export const scheduleSettingsSchema = z.object({
  phases: z.array(z.string().min(1)).min(1),
  milestoneToleranceDays: z.number().int().min(0),
  spiGreenMin: z.number(),
  spiYellowMin: z.number(),
});
export type ScheduleSettings = z.infer<typeof scheduleSettingsSchema>;

const milestones: CollectionDef<Milestone> = {
  module: 'schedule',
  name: 'milestones',
  table: 'schedule_milestones',
  label: 'Marcos',
  cardinality: 'many',
  schema: milestoneSchema,
  codePrefix: 'M',
  refs: [
    {
      field: 'predecessorIds',
      label: 'predecessor',
      target: { module: 'scope', collection: 'wbs' },
      many: true,
      required: false,
      constraint: 'isWorkPackage',
    },
    {
      field: 'ownerId',
      label: 'responsável',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isPerson',
    },
  ],
  describe: (m) => `${m.code} ${m.name}`.trim(),
};

export const scheduleManifest: ModuleManifest<typeof scheduleSettingsSchema> = {
  id: 'schedule',
  label: 'Cronograma',
  mandatory: false,
  requires: ['scope'],
  settingsSchema: scheduleSettingsSchema,
  defaultSettings: {
    phases: DEFAULT_PHASES,
    milestoneToleranceDays: 5,
    spiGreenMin: 0.95,
    spiYellowMin: 0.85,
  },
  collections: [milestones],
  constraints: {},
};
