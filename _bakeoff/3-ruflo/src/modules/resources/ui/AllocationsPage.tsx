import { formatDateBR } from '@/shared/lib/dates';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge, StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { estimatedCost } from '../domain/load';
import { ALLOCATION_STATUSES, type Allocation } from '../model/allocation';
import { allocationExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'resourceId', label: 'Recurso', type: 'reference', module: 'resources', collection: 'resources' },
  {
    key: 'workPackageId',
    label: 'Pacote da EAP',
    type: 'reference',
    module: 'scope',
    collection: 'wbs',
    constraint: 'isWorkPackage',
  },
  { key: 'pct', label: 'Dedicação (%)', type: 'number', min: 1, max: 100, integer: true },
  { key: 'start', label: 'Início', type: 'date' },
  { key: 'finish', label: 'Término', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ALLOCATION_STATUSES },
];

const newAllocation = (): Values => ({
  code: '',
  resourceId: null,
  workPackageId: null,
  pct: 100,
  start: null,
  finish: null,
  status: 'Planejada',
});

export function AllocationsPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, config } = analysis;
  const { hoursPerDay } = config.settings.resources;
  const currency = config.settings.finances.baseCurrency;
  const resource = (a: Allocation) => (a.resourceId ? snapshot.resources.resources[a.resourceId] : undefined);
  const pkg = (a: Allocation) => (a.workPackageId ? snapshot.scope.wbs[a.workPackageId] : undefined);
  return (
    <RegisterView<Allocation>
      module="resources"
      collection="allocations"
      title="Alocações"
      fields={fields}
      examples={allocationExamples}
      newEntity={newAllocation}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'resource', label: 'Recurso', render: (a) => resource(a)?.name ?? '—' },
        {
          key: 'pkg',
          label: 'Pacote',
          render: (a) => {
            const p = pkg(a);
            return p ? `${p.code} ${p.name}` : <span className="muted">—</span>;
          },
        },
        { key: 'pct', label: '%', mono: true, render: (a) => `${a.pct}%` },
        { key: 'period', label: 'Período', mono: true, render: (a) => `${formatDateBR(a.start)} – ${formatDateBR(a.finish)}` },
        { key: 'status', label: 'Status', render: (a) => <StatusBadge status={a.status} /> },
        {
          key: 'cost',
          label: 'Custo estimado',
          render: (a) => {
            const r = resource(a);
            const cost = r ? estimatedCost(a, r, hoursPerDay) : null;
            return cost === null ? (
              <span className="muted">—</span>
            ) : (
              <span className="row" style={{ flexWrap: 'nowrap' }}>
                <span className="tb-mono">{formatMoneyBR(cost, currency)}</span>
                <Badge text="informativo" tone="gray" />
              </span>
            );
          },
        },
      ]}
    />
  );
}
