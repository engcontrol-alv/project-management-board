import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { WBS_KINDS, type WbsNode } from '../model/wbs';
import { wbsExamples } from '../examples';

const isPackage = (v: Values) => v.kind === 'Pacote de trabalho';

const newNode = (): Values => ({
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
});

/** Agrupador não tem duração, predecessores nem progresso próprio. */
const onDraftChange: DraftChange = (prev, next) => {
  if (prev.kind === next.kind || next.kind !== 'Agrupador') return { value: next };
  return {
    value: {
      ...next,
      duration: 0,
      predecessorIds: [],
      startNoEarlierThan: null,
      actualStart: null,
      actualFinish: null,
      percentComplete: 0,
    },
  };
};

export function WbsPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { derived, snapshot, config } = analysis;
  const schedule = derived.schedule;
  const cycle = schedule.ok ? null : schedule.cycle;

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'kind', label: 'Tipo', type: 'select', options: WBS_KINDS, hint: 'Agrupador só organiza; pacote de trabalho tem duração e progresso.' },
    {
      key: 'parentId',
      label: 'Agrupador pai',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      constraint: 'isGroup',
      exclude: (t, v) => t.id === v.id,
    },
    { key: 'duration', label: 'Duração (dias corridos)', type: 'number', min: 0, integer: true, visible: isPackage },
    {
      key: 'predecessorIds',
      label: 'Predecessores',
      type: 'reference',
      module: 'scope',
      collection: 'wbs',
      multiple: true,
      constraint: 'isWorkPackage',
      exclude: (t, v) => t.id === v.id,
      visible: isPackage,
      hint: 'Término → início, sem defasagem.',
    },
    { key: 'startNoEarlierThan', label: 'Não começar antes de', type: 'date', visible: isPackage },
    { key: 'actualStart', label: 'Início real', type: 'date', visible: isPackage },
    { key: 'actualFinish', label: 'Término real', type: 'date', visible: isPackage, hint: 'Exige % físico 100.' },
    { key: 'percentComplete', label: '% físico', type: 'number', min: 0, max: 100, visible: isPackage },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'phase', label: 'Fase', type: 'select', options: config.settings.schedule.phases },
  ];

  const dates = (n: WbsNode) => {
    if (n.kind === 'Agrupador') return derived.groups[n.id] ?? { start: null, finish: null, percent: null };
    const t = schedule.ok ? schedule.tasks[n.id] : undefined;
    return { start: t?.start ?? null, finish: t?.finish ?? null, percent: n.percentComplete };
  };
  const codes = (ids: string[]) => ids.map((id) => snapshot.scope.wbs[id as keyof typeof snapshot.scope.wbs]?.code ?? id).join(' → ');

  return (
    <RegisterView<WbsNode>
      module="scope"
      collection="wbs"
      title="EAP"
      fields={fields}
      examples={wbsExamples}
      newEntity={newNode}
      onDraftChange={onDraftChange}
      rowClassName={(n) => (n.kind === 'Agrupador' ? 'row-group' : undefined)}
      summary={
        cycle && (
          <div className="errors" role="alert">
            A EAP tem dependência circular: {codes([...cycle, cycle[0]!])}. As datas não podem ser calculadas.
          </div>
        )
      }
      columns={[
        {
          key: 'code',
          label: 'Código',
          render: (n) => (
            <span className="tb-mono" style={{ paddingLeft: (n.code.split('.').length - 1) * 16, color: n.kind === 'Agrupador' ? 'var(--ink)' : 'var(--ink-soft)' }}>
              {n.code}
            </span>
          ),
        },
        {
          key: 'name',
          label: 'Nome',
          render: (n) => (
            <span style={{ paddingLeft: (n.code.split('.').length - 1) * 16, display: 'inline-flex', gap: 8, alignItems: 'center' }}>
              {n.kind === 'Agrupador' ? <strong>{n.name}</strong> : <span>{n.name}</span>}
              {n.kind === 'Pacote de trabalho' && schedule.ok && schedule.tasks[n.id]?.critical && (
                <Badge text="Crítico" tone="red" title="No caminho crítico (folga total zero)" />
              )}
            </span>
          ),
        },
        { key: 'kind', label: 'Tipo', render: (n) => <span className="muted small">{n.kind}</span> },
        { key: 'duration', label: 'Duração', mono: true, render: (n) => (n.kind === 'Agrupador' ? '—' : `${n.duration} d`) },
        { key: 'start', label: 'Início', mono: true, render: (n) => formatDateBR(dates(n).start) },
        { key: 'finish', label: 'Término', mono: true, render: (n) => formatDateBR(dates(n).finish) },
        {
          key: 'percent',
          label: '% físico',
          mono: true,
          render: (n) => {
            const p = dates(n).percent;
            return (
              <span style={{ whiteSpace: 'nowrap' }}>
                <span className="mini-meter" aria-hidden="true">
                  <span style={{ width: `${Math.max(0, Math.min(100, p ?? 0))}%` }} />
                </span>
                {formatPercent(p)}
              </span>
            );
          },
        },
      ]}
    />
  );
}
