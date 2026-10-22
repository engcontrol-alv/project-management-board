import { z } from 'zod';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { budgetLineSchema, type BudgetLine } from './model/budget-line';
import { procurementSchema, type Procurement } from './model/procurement';

const party = (field: string, label: string, constraint?: string, required = false): RefDef => ({
  field,
  label,
  target: { module: 'stakeholders', collection: 'parties' },
  many: false,
  required,
  constraint,
});

const planRefs: RefDef[] = [
  {
    field: 'workPackageId',
    label: 'pacote',
    target: { module: 'scope', collection: 'wbs' },
    many: false,
    required: false,
    constraint: 'isWorkPackage',
  },
  {
    field: 'milestoneId',
    label: 'marco',
    target: { module: 'schedule', collection: 'milestones' },
    many: false,
    required: false,
  },
];

const budgetLines: CollectionDef<BudgetLine> = {
  module: 'finances',
  name: 'budgetLines',
  table: 'finances_budgetLines',
  label: 'Linhas de orçamento',
  cardinality: 'many',
  schema: budgetLineSchema,
  codePrefix: 'ORC',
  refs: [...planRefs, party('partyId', 'parte interessada'), party('ownerId', 'responsável', 'isPerson')],
  describe: (l) => `${l.code} ${l.description}`.trim(),
};

const procurements: CollectionDef<Procurement> = {
  module: 'finances',
  name: 'procurements',
  table: 'finances_procurements',
  label: 'Contratações',
  cardinality: 'many',
  schema: procurementSchema,
  codePrefix: 'CTR',
  refs: [
    party('supplierId', 'fornecedor', 'isSupplierOrganization', true),
    ...planRefs,
    party('ownerId', 'responsável', 'isPerson'),
  ],
  describe: (p) => `${p.code} ${p.description}`.trim(),
};

export const CURRENCIES = ['BRL', 'USD', 'EUR'] as const;

export const financesSettingsSchema = z
  .object({
    baseCurrency: z.enum(CURRENCIES),
    currencies: z.array(z.enum(CURRENCIES)).min(1),
    cpiGreenMin: z.number(),
    cpiYellowMin: z.number(),
  })
  .strict()
  .refine((s) => s.currencies.includes(s.baseCurrency), {
    message: 'a moeda base deve estar entre as aceitas',
  });
export type FinancesSettings = z.infer<typeof financesSettingsSchema>;

export const financesManifest: ModuleManifest<typeof financesSettingsSchema> = {
  id: 'finances',
  label: 'Finanças',
  mandatory: false,
  requires: [],
  settingsSchema: financesSettingsSchema,
  defaultSettings: {
    baseCurrency: 'BRL',
    currencies: ['BRL', 'USD', 'EUR'],
    cpiGreenMin: 0.95,
    cpiYellowMin: 0.85,
  },
  collections: [budgetLines, procurements],
  constraints: {},
};
