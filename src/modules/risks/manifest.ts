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

/** Faixas padrão por escala (SPEC §8.4): 3×3 1–2/3–4/6/9; 5×5 1–4/5–9/10–16/20–25. */
export const DEFAULT_BANDS = {
  3: { low: 2, moderate: 4, high: 6 },
  5: { low: 4, moderate: 9, high: 16 },
} as const;

export const risksSettingsSchema = z
  .object({
    scale: z.union([z.literal(3), z.literal(5)]),
    bands: z
      .object({ low: z.number().int(), moderate: z.number().int(), high: z.number().int() })
      .strict()
      .refine((b) => b.low < b.moderate && b.moderate < b.high, { message: 'faixas devem ser crescentes' }),
    categories: z.array(z.string().min(1)).min(1),
  })
  .strict()
  .refine((s) => s.bands.low >= 1 && s.bands.high < s.scale * s.scale, {
    path: ['bands'],
    message: 'faixas devem ficar entre 1 e a pontuação máxima da escala (Crítico acima de Alto)',
  });
export type RisksSettings = z.infer<typeof risksSettingsSchema>;

export const risksManifest: ModuleManifest<typeof risksSettingsSchema> = {
  id: 'risks',
  label: 'Riscos',
  mandatory: false,
  requires: [],
  settingsSchema: risksSettingsSchema,
  defaultSettings: { scale: 3, bands: { ...DEFAULT_BANDS[3] }, categories: DEFAULT_RISK_CATEGORIES },
  collections: [risks],
  constraints: {},
};
