import { Badge } from '@/shared/ui/Badge';
import { formatDateBR } from '@/shared/lib/dates';
import { CornerDownRight, FolderTree } from 'lucide-react';
import { ProgressBar } from '@/shared/ui/ProgressBar';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { useAnalysis } from '@/platform/react/hooks';
import { WBS_KINDS, type WbsNode } from '../index';
import { wbsExamples } from '../examples';

const isPackage = (v: WbsNode) => v.kind === 'Pacote de trabalho';

const newNode = () =>
  ({
    id: '',
    code: '',
    name: '',
    parentId: null,
    kind: 'Pacote de trabalho',
    duration: 1,
    predecessorIds: [],
    startNoEarlierThan: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    ownerId: null,
    phase: '',
  }) as unknown as WbsNode;

/** Agrupador não tem duração, predecessores nem progresso próprio. */
function transform(_prev: WbsNode, next: WbsNode) {
  if (next.kind !== 'Agrupador') return { value: next };
  return {
    value: {
      ...next,
      duration: 0,
      predecessorIds: [],
      startNoEarlierThan: null,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
    } as WbsNode,
  };
}

export function WbsPage() {
  const analysis = useAnalysis();
  const phases = analysis?.config.settings.schedule.phases ?? [];
  const derived = analysis?.derived;
  const schedule = derived?.schedule;

  const fields: FieldDef[] = [
    { key: 'kind', label: 'Tipo', type: 'select', options: WBS_KINDS, hint: 'Agrupador só organiza; pacote de trabalho tem duração e progresso.' },
    { key: 'name', label: 'Nome', type: 'text', required: true },
    {
      key: 'parentId',
      label: 'Agrupador pai',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      constraint: 'isGroup',
      exclude: (v: WbsNode) => [v.id],
    },
    { key: 'duration', label: 'Duração (dias corridos)', type: 'number', min: 0, integer: true, visible: isPackage },
    {
      key: 'predecessorIds',
      label: 'Predecessores',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      constraint: 'isWorkPackage',
      multiple: true,
      exclude: (v: WbsNode) => [v.id],
      visible: isPackage,
      hint: 'Término→Início: este pacote começa no dia seguinte ao término dos predecessores.',
    },
    { key: 'startNoEarlierThan', label: 'Não começar antes de', type: 'date', visible: isPackage },
    { key: 'actualStart', label: 'Início real', type: 'date', visible: isPackage },
    { key: 'actualFinish', label: 'Término real', type: 'date', visible: isPackage, hint: 'Exige 100% concluído.' },
    { key: 'percentComplete', label: '% físico', type: 'number', min: 0, max: 100, visible: isPackage },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'phase', label: 'Fase', type: 'select', options: phases, visible: isPackage },
  ];

  const dates = (n: WbsNode) => {
    if (n.kind === 'Agrupador') return derived?.groups[n.id];
    return schedule?.ok ? schedule.tasks[n.id] : undefined;
  };

  return (
    <RegisterView<WbsNode>
      module="scope"
      collection="wbs"
      title="EAP — Estrutura Analítica do Projeto"
      description={
        <>
          <p className="tb-hint">Datas planejadas são calculadas pelo caminho crítico a partir das durações e predecessores.</p>
          {schedule && !schedule.ok && (
            <div role="alert" className="tb-alert-box">
              Dependência circular entre pacotes: datas não podem ser calculadas.
            </div>
          )}
        </>
      }
      columns={[
        {
          key: 'name',
          label: 'Nome',
          render: (n) => {
            const group = n.kind === 'Agrupador';
            const Icon = group ? FolderTree : CornerDownRight;
            return (
              <span
                className="tb-row"
                style={{ flexWrap: 'nowrap', gap: 6, paddingLeft: (n.code.split('.').length - 1) * 18, fontWeight: group ? 600 : 400 }}
              >
                <Icon size={14} color={group ? 'var(--primary)' : 'var(--line-strong)'} aria-hidden="true" style={{ flex: 'none' }} />
                {n.name}
              </span>
            );
          },
        },
        { key: 'kind', label: 'Tipo', render: (n) => <span className="tb-hint" style={{ fontSize: 12.5 }}>{n.kind}</span> },
        { key: 'duration', label: 'Duração', mono: true, render: (n) => (n.kind === 'Agrupador' ? '—' : `${n.duration} d`) },
        { key: 'start', label: 'Início', mono: true, render: (n) => formatDateBR(dates(n)?.start ?? null) },
        { key: 'finish', label: 'Término', mono: true, render: (n) => formatDateBR(dates(n)?.finish ?? null) },
        {
          key: 'percent',
          label: '% físico',
          render: (n) => <ProgressBar value={n.kind === 'Agrupador' ? (derived?.groups[n.id]?.percent ?? null) : n.percentComplete} />,
        },
        {
          key: 'critical',
          label: 'Crítico',
          render: (n) => {
            const t = n.kind === 'Pacote de trabalho' && schedule?.ok ? schedule.tasks[n.id] : undefined;
            if (!t) return <span className="tb-hint">—</span>;
            return t.critical ? <Badge text="Crítico" tone="red" dot /> : <span className="tb-mono tb-hint">folga {t.totalFloat} d</span>;
          },
        },
      ]}
      rowClassName={(n) => (n.kind === 'Agrupador' ? 'tb-row-group' : undefined)}
      fields={fields}
      examples={wbsExamples}
      newEntity={newNode}
      transform={transform}
    />
  );
}
