import { z } from 'zod';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { riskSchema, type Risk } from './model/risk';

const many = (field: string, label: string, module: RefDef['target']['module'], collection: string, constraint?: string): RefDef => ({
  field,
  label,
  target: { module, collection },
  many: true,
  required: false,
  constraint,
});

const risks: CollectionDef<Risk> = {
  module: 'risks',
  name: 'risks',
  table: 'risks_risks',
  label: 'Riscos',
  cardinality: 'many',
  schema: riskSchema,
  codePrefix: 'R',
  refs: [
    {
      field: 'ownerId',
      label: 'responsável',
      target: { module: 'stakeholders', collection: 'parties' },
      many: false,
      required: false,
      constraint: 'isPerson',
    },
    many('workPackageIds', 'pacotes', 'scope', 'wbs', 'isWorkPackage'),
    many('milestoneIds', 'marcos', 'schedule', 'milestones'),
    many('deliverableIds', 'entregáveis', 'scope', 'deliverables'),
    many('procurementIds', 'contratações', 'finances', 'procurements'),
    many('partyIds', 'partes interessadas', 'stakeholders', 'parties'),
  ],
  describe: (r) => `${r.code} ${r.title}`.trim(),
};

export const DEFAULT_RISK_CATEGORIES = [
  'Técnico',
  'Cronograma',
  'Custo',
  'Fornecedor/Aquisição',
  'Segurança/SSMA',
  'Cliente/Contratual',
  'Regulatório',
  'Outro',
];

export const risksSettingsSchema = z
  .object({
    /** D2: só 3×3 nesta etapa; o campo prepara o 5×5. */
    scale: z.literal(3),
    bands: z
      .object({ low: z.number().int(), moderate: z.number().int(), high: z.number().int() })
      .strict()
      .refine((b) => b.low < b.moderate && b.moderate < b.high, { message: 'faixas devem ser crescentes' }),
    categories: z.array(z.string().min(1)).min(1),
  })
  .strict();
export type RisksSettings = z.infer<typeof risksSettingsSchema>;

export const risksManifest: ModuleManifest<typeof risksSettingsSchema> = {
  id: 'risks',
  label: 'Riscos',
  mandatory: false,
  requires: [],
  settingsSchema: risksSettingsSchema,
  defaultSettings: { scale: 3, bands: { low: 2, moderate: 4, high: 6 }, categories: DEFAULT_RISK_CATEGORIES },
  collections: [risks],
  constraints: {},
};
