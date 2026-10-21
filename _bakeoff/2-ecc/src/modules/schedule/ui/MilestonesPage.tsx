import { Badge } from '@/shared/ui/Badge';
import { statusTone } from '@/shared/ui/tones';
import { formatDateBR } from '@/shared/lib/dates';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { useAnalysis } from '@/platform/react/hooks';
import { MILESTONE_TYPES, type Milestone } from '../index';
import { milestoneExamples } from '../examples';

const newMilestone = () =>
  ({
    id: '',
    code: '',
    name: '',
    phase: '',
    type: 'Interno',
    predecessorIds: [],
    manualDate: null,
    actualDate: null,
    ownerId: null,
  }) as unknown as Milestone;

export function MilestonesPage() {
  const analysis = useAnalysis();
  const phases = analysis?.config.settings.schedule.phases ?? [];
  const derived = analysis?.derived;

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'phase', label: 'Fase', type: 'select', options: phases },
    { key: 'type', label: 'Tipo', type: 'select', options: MILESTONE_TYPES },
    {
      key: 'predecessorIds',
      label: 'Predecessores',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      constraint: 'isWorkPackage',
      multiple: true,
      hint: 'O marco ocorre quando todos estes pacotes terminam.',
    },
    {
      key: 'manualDate',
      label: 'Data manual',
      type: 'date',
      visible: (v: Milestone) => v.predecessorIds.length === 0,
      hint: 'Obrigatória quando o marco não tem predecessores.',
    },
    { key: 'actualDate', label: 'Data real', type: 'date' },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  ];

  return (
    <RegisterView<Milestone>
      module="schedule"
      collection="milestones"
      title="Marcos"
      columns={[
        { key: 'name', label: 'Marco', render: (m) => (<div><div>{m.name}</div><div className="tb-mono tb-hint">{m.phase}</div></div>) },
        { key: 'type', label: 'Tipo' },
        { key: 'forecast', label: 'Previsão', mono: true, render: (m) => formatDateBR(derived?.milestones[m.id]?.forecast) },
        { key: 'baseline', label: 'Linha de base', mono: true, render: (m) => formatDateBR(derived?.milestones[m.id]?.baselineDate) },
        {
          key: 'deviation',
          label: 'Desvio',
          mono: true,
          render: (m) => {
            const d = derived?.milestones[m.id]?.deviationDays;
            return d === null || d === undefined ? '—' : `${d > 0 ? '+' : ''}${d} d`;
          },
        },
        {
          key: 'status',
          label: 'Situação',
          render: (m) => {
            const s = derived?.milestones[m.id]?.status;
            return s ? <Badge text={s} tone={statusTone(s)} /> : '—';
          },
        },
        {
          key: 'critical',
          label: 'Crítico',
          render: (m) => (derived?.milestones[m.id]?.critical ? <Badge text="Crítico" tone="red" /> : <span className="tb-hint">—</span>),
        },
      ]}
      fields={fields}
      examples={milestoneExamples}
      newEntity={newMilestone}
    />
  );
}
