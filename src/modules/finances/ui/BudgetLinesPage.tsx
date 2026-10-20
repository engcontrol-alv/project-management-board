import { formatDateBR } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { BUDGET_CATEGORIES, BUDGET_STATUSES, ITEM_KINDS, NATURES, type BudgetLine } from '../model/budget-line';
import { budgetLineExamples } from '../examples';
import { currencyFields, Money, ownerField, planFields } from './common';

export function BudgetLinesPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { derived, config } = analysis;
  const { baseCurrency, currencies } = config.settings.finances;
  const late = (l: BudgetLine) =>
    !!l.plannedDate && l.plannedDate < derived.statusDate && (l.status === 'Planejado' || l.status === 'Em andamento');

  const fields: FieldDef[] = [
    { key: 'description', label: 'Descrição', type: 'text', wide: true },
    { key: 'kind', label: 'Tipo', type: 'select', options: ITEM_KINDS },
    { key: 'nature', label: 'Natureza', type: 'select', options: NATURES },
    { key: 'category', label: 'Categoria', type: 'select', options: BUDGET_CATEGORIES },
    ...currencyFields(currencies, baseCurrency),
    { key: 'budgetedCents', label: 'Valor orçado', type: 'money' },
    { key: 'actualCents', label: 'Valor realizado', type: 'money' },
    { key: 'plannedDate', label: 'Data prevista', type: 'date' },
    { key: 'actualDate', label: 'Data real', type: 'date' },
    { key: 'status', label: 'Status', type: 'select', options: BUDGET_STATUSES, hint: 'Realizado exige valor e data reais.' },
    ...planFields,
    { key: 'partyId', label: 'Parte interessada', type: 'reference', module: 'stakeholders', collection: 'parties' },
    ownerField,
  ];
  const newLine = (): Values => ({
    code: '',
    description: '',
    kind: 'Custo',
    nature: 'OPEX',
    category: 'Mão de obra',
    currency: baseCurrency,
    rate: null,
    budgetedCents: 0,
    actualCents: 0,
    plannedDate: null,
    actualDate: null,
    status: 'Planejado',
    workPackageId: null,
    milestoneId: null,
    partyId: null,
    ownerId: null,
  });

  return (
    <RegisterView<BudgetLine>
      module="finances"
      collection="budgetLines"
      title="Linhas de orçamento"
      fields={fields}
      examples={budgetLineExamples}
      newEntity={newLine}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        {
          key: 'description',
          label: 'Descrição',
          render: (l) => (
            <div>
              {l.description}
              <div className="subline">
                {l.nature} · {l.category}
              </div>
            </div>
          ),
        },
        { key: 'kind', label: 'Tipo', render: (l) => <StatusBadge status={l.kind} /> },
        { key: 'budgeted', label: 'Orçado', render: (l) => <Money cents={l.budgetedCents} currency={l.currency} /> },
        { key: 'actual', label: 'Realizado', render: (l) => <Money cents={l.actualCents} currency={l.currency} /> },
        { key: 'plannedDate', label: 'Prevista', mono: true, render: (l) => formatDateBR(l.plannedDate) },
        {
          key: 'status',
          label: 'Status',
          render: (l) => (
            <span className="row" style={{ flexWrap: 'nowrap' }}>
              <StatusBadge status={l.status} />
              {late(l) && <StatusBadge status="Atrasada" />}
            </span>
          ),
        },
      ]}
    />
  );
}
