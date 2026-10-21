import { formatDateBR } from '@/shared/lib/dates';
import { formatDays } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { MILESTONE_TYPES, type Milestone } from '../model/milestone';
import { milestoneExamples } from '../examples';

const noPredecessors = (v: Values) => !Array.isArray(v.predecessorIds) || v.predecessorIds.length === 0;

const newMilestone = (): Values => ({
  code: '',
  name: '',
  phase: '',
  type: 'Interno',
  predecessorIds: [],
  manualDate: null,
  actualDate: null,
  ownerId: null,
});

export function MilestonesPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { derived, config } = analysis;

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'type', label: 'Tipo', type: 'select', options: MILESTONE_TYPES },
    { key: 'phase', label: 'Fase', type: 'select', options: config.settings.schedule.phases },
    {
      key: 'predecessorIds',
      label: 'Predecessores (pacotes)',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      multiple: true,
      constraint: 'isWorkPackage',
      hint: 'O marco ocorre quando todos terminam.',
    },
    { key: 'manualDate', label: 'Data manual', type: 'date', visible: noPredecessors, hint: 'Obrigatória sem predecessores.' },
    { key: 'actualDate', label: 'Data real', type: 'date' },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  ];

  const d = (m: Milestone) => derived.milestones[m.id];
  return (
    <RegisterView<Milestone>
      module="schedule"
      collection="milestones"
      title="Marcos"
      fields={fields}
      examples={milestoneExamples}
      newEntity={newMilestone}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'name', label: 'Marco', render: (m) => (<div>{m.name}<div className="tb-mono muted small">{m.phase}</div></div>) },
        { key: 'forecast', label: 'Previsão', mono: true, render: (m) => formatDateBR(d(m)?.forecast) },
        { key: 'baseline', label: 'Linha de base', mono: true, render: (m) => formatDateBR(d(m)?.baselineDate) },
        { key: 'deviation', label: 'Desvio', mono: true, render: (m) => formatDays(d(m)?.deviationDays) },
        { key: 'status', label: 'Situação', render: (m) => <StatusBadge status={d(m)?.status ?? 'No prazo'} /> },
        { key: 'critical', label: 'Crítico', render: (m) => <StatusBadge status={d(m)?.critical ? 'Sim' : 'Não'} /> },
      ]}
    />
  );
}
