import { useSearchParams } from 'react-router-dom';
import { formatDateBR } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { NATURES } from '../model/budget-line';
import {
  CONTRACT_STATUSES,
  CRITICALITY,
  deliveryStatusesFor,
  ORIGINS,
  PROCUREMENT_TYPES,
  type Procurement,
} from '../model/procurement';
import { procurementExamples } from '../examples';
import { currencyFields, Money, ownerField, planFields } from './common';

const isImported = (v: Values) => v.origin === 'Importado';

export function ProcurementsPage() {
  const analysis = useAnalysis();
  const [params] = useSearchParams();
  if (!analysis) return null;
  const { snapshot, config } = analysis;
  const { baseCurrency, currencies } = config.settings.finances;
  const direct = snapshot.governance.profile.procurementPolicy.billing === 'Direto ao cliente';

  const fields: FieldDef[] = [
    { key: 'description', label: 'Descrição', type: 'text', wide: true },
    { key: 'type', label: 'Tipo', type: 'select', options: PROCUREMENT_TYPES },
    { key: 'nature', label: 'Natureza', type: 'select', options: NATURES },
    {
      key: 'supplierId',
      label: 'Fornecedor',
      type: 'reference',
      module: 'stakeholders',
      collection: 'parties',
      constraint: 'isSupplierOrganization',
      hint: 'Obrigatório: organização com papel Fornecedor ou Prestador de serviço.',
    },
    { key: 'criticality', label: 'Criticidade', type: 'select', options: CRITICALITY },
    { key: 'origin', label: 'Origem', type: 'select', options: ORIGINS },
    { key: 'country', label: 'País de origem', type: 'text', visible: isImported },
    ...currencyFields(currencies, baseCurrency),
    { key: 'budgetedCents', label: 'Orçado', type: 'money', hint: 'Previsto.' },
    { key: 'committedCents', label: 'Comprometido', type: 'money', hint: 'Pedido ou contrato emitido.' },
    { key: 'actualCents', label: 'Realizado', type: 'money', hint: 'Faturado/pago.' },
    { key: 'contractStatus', label: 'Status da contratação', type: 'select', options: CONTRACT_STATUSES },
    { key: 'deliveryStatus', label: 'Status da entrega', type: 'select', options: (v) => deliveryStatusesFor(String(v.type)) },
    { key: 'requestDate', label: 'Data da solicitação', type: 'date' },
    { key: 'dueDate', label: 'Prazo de entrega previsto', type: 'date' },
    { key: 'completionDate', label: 'Recebimento/conclusão', type: 'date' },
    ...planFields.map((f) =>
      f.key === 'milestoneId' ? { ...f, label: 'Marco que depende da entrega' } : f,
    ),
    ownerField,
  ];
  const newProcurement = (): Values => ({
    code: '',
    description: '',
    type: 'Produto',
    nature: 'CAPEX',
    supplierId: null,
    origin: 'Nacional',
    country: '',
    currency: baseCurrency,
    rate: null,
    workPackageId: null,
    milestoneId: null,
    criticality: 'Média',
    ownerId: null,
    budgetedCents: 0,
    committedCents: 0,
    actualCents: 0,
    contractStatus: 'A solicitar',
    deliveryStatus: 'Não iniciado',
    requestDate: null,
    dueDate: null,
    completionDate: null,
  });
  const supplierName = (p: Procurement) => (p.supplierId ? snapshot.stakeholders.parties[p.supplierId]?.name : null) ?? '—';

  return (
    <RegisterView<Procurement>
      module="finances"
      collection="procurements"
      title="Contratações"
      fields={fields}
      examples={procurementExamples}
      newEntity={newProcurement}
      openNew={params.get('nova') === '1'}
      summary={direct && <p className="notice">Contratações deste projeto não compõem receita própria.</p>}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        {
          key: 'description',
          label: 'Contratação',
          render: (p) => (
            <div>
              {p.description}
              <div className="subline">
                {supplierName(p)} · {p.type} · {p.origin === 'Importado' ? `Importado (${p.country})` : 'Nacional'}
              </div>
            </div>
          ),
        },
        { key: 'contract', label: 'Contratação', render: (p) => <StatusBadge status={p.contractStatus} /> },
        { key: 'delivery', label: 'Entrega', render: (p) => <StatusBadge status={p.deliveryStatus} /> },
        { key: 'budgeted', label: 'Orçado', render: (p) => <Money cents={p.budgetedCents} currency={p.currency} /> },
        { key: 'committed', label: 'Comprometido', render: (p) => <Money cents={p.committedCents} currency={p.currency} /> },
        { key: 'actual', label: 'Realizado', render: (p) => <Money cents={p.actualCents} currency={p.currency} /> },
        { key: 'dueDate', label: 'Prazo', mono: true, render: (p) => formatDateBR(p.dueDate) },
      ]}
    />
  );
}
