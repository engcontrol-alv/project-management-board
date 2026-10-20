import { formatMoneyBR } from '@/shared/lib/money';
import type { FieldDef, Values } from '@/registers/types';

/** Valor monetário em mono, na moeda informada. */
export function Money({ cents, currency = 'BRL' }: { cents: number | null; currency?: string }) {
  return <span className="tb-mono">{cents === null ? 'n/a' : formatMoneyBR(cents, currency)}</span>;
}

/** Campos de moeda e taxa: a taxa só aparece quando a moeda difere da base. */
export function currencyFields(currencies: readonly string[], base: string): FieldDef[] {
  return [
    { key: 'currency', label: 'Moeda', type: 'select', options: currencies },
    {
      key: 'rate',
      label: `Taxa para ${base}`,
      type: 'number',
      min: 0,
      visible: (v: Values) => v.currency !== base,
      hint: `Quantos ${base} vale 1 unidade da moeda do item (ex.: 5,12).`,
    },
  ];
}

/** Vínculos com o plano (somem quando Escopo/Cronograma estão desligados). */
export const planFields: FieldDef[] = [
  {
    key: 'workPackageId',
    label: 'Pacote da EAP',
    type: 'reference',
    module: 'scope',
    collection: 'wbs',
    constraint: 'isWorkPackage',
    hint: 'Itens de custo ligados a pacotes entram no EVM.',
  },
  { key: 'milestoneId', label: 'Marco', type: 'reference', module: 'schedule', collection: 'milestones' },
];

export const ownerField: FieldDef = {
  key: 'ownerId',
  label: 'Responsável',
  type: 'reference',
  module: 'stakeholders',
  collection: 'parties',
  constraint: 'isPerson',
};
