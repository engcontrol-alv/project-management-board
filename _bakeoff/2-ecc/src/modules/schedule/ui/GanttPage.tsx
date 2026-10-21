import { useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { addDays, diffDays, formatDateBR, type IsoDate } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { currentBaseline } from '@/analytics/derive';
import { useDerived, useSnapshot } from '@/platform/react/hooks';
import { ganttLayout, ganttRange, monthStarts, type GanttBar } from './gantt-layout';

const ROW = 32;
const HEAD = 44;
const LABEL_W = 300;
const SCALES = { semana: 12, mês: 4 } as const;
type Scale = keyof typeof SCALES;

const COLORS = {
  plan: { base: '#c3d5e2', done: 'var(--primary)' },
  critical: { base: '#e7c2ce', done: 'var(--red)' },
  group: 'var(--ink-soft)',
  baseline: '#9aa5b1',
};

type Row =
  | { kind: 'wbs'; id: string; code: string; name: string; depth: number; group: boolean; zero: boolean; percent: number | null }
  | { kind: 'milestone'; id: string; code: string; name: string; done: boolean };

/** Gantt somente leitura em SVG: plano atual sobre a LB, progresso, críticos em destaque, data de status. */
export function GanttPage() {
  const snapshot = useSnapshot();
  const derived = useDerived();
  const [scale, setScale] = useState<Scale>('semana');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scrolledTo = useRef<string | null>(null);
  if (!snapshot || !derived) return null;
  const { schedule } = derived;
  if (!schedule.ok) return <div role="alert" className="tb-alert-box">Dependência circular na EAP: o Gantt não pode ser desenhado.</div>;
  const baseline = currentBaseline(snapshot);

  const nodes = Object.values(snapshot.scope.wbs).sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }));
  const hidden = (n: (typeof nodes)[number]): boolean => {
    let p = n.parentId ? snapshot.scope.wbs[n.parentId] : undefined;
    while (p) {
      if (collapsed.has(p.id)) return true;
      p = p.parentId ? snapshot.scope.wbs[p.parentId] : undefined;
    }
    return false;
  };
  const rows: Row[] = [
    ...nodes.filter((n) => !hidden(n)).map((n) => ({
      kind: 'wbs' as const,
      id: n.id,
      code: n.code,
      name: n.name,
      depth: n.code.split('.').length - 1,
      group: n.kind === 'Agrupador',
      zero: n.kind === 'Pacote de trabalho' && n.duration === 0,
      percent: n.kind === 'Agrupador' ? (derived.groups[n.id]?.percent ?? null) : n.percentComplete,
    })),
    ...Object.values(snapshot.schedule.milestones)
      .sort((a, b) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true }))
      .map((m) => ({ kind: 'milestone' as const, id: m.id, code: m.code, name: m.name, done: m.actualDate !== null })),
  ];

  const planned: Record<string, { start: IsoDate; finish: IsoDate } | undefined> = {};
  for (const r of rows) {
    if (r.kind === 'milestone') {
      const f = derived.milestones[r.id]?.forecast;
      planned[r.id] = f ? { start: f, finish: f } : undefined;
    } else if (r.group) {
      const g = derived.groups[r.id];
      planned[r.id] = g?.start && g.finish ? { start: g.start, finish: g.finish } : undefined;
    } else planned[r.id] = schedule.tasks[r.id];
  }
  const baseDates = (r: Row) =>
    r.kind === 'milestone'
      ? baseline?.milestones[r.id] && { start: baseline.milestones[r.id]!.date, finish: baseline.milestones[r.id]!.date }
      : baseline?.workPackages[r.id];

  const allDates = rows.flatMap((r) => {
    const p = planned[r.id];
    const b = baseDates(r);
    return [p?.start, p?.finish, b?.start, b?.finish].filter((d): d is IsoDate => !!d);
  });
  const range = ganttRange([...allDates, derived.statusDate]);
  if (!range || !rows.length) return <p className="tb-empty">Cadastre a EAP e os marcos para ver o Gantt.</p>;

  const px = SCALES[scale];
  const bars = (source: (r: Row) => { start: IsoDate; finish: IsoDate } | undefined, suffix: string): GanttBar[] =>
    rows.flatMap((r) => {
      const d = source(r);
      return d ? [{ id: r.id + suffix, start: d.start, finish: d.finish, zero: r.kind === 'milestone' || (r.kind === 'wbs' && r.zero) }] : [];
    });
  const layout = ganttLayout({ rangeStart: range.start, rangeEnd: range.end, pxPerDay: px, bars: [...bars((r) => planned[r.id], ''), ...bars(baseDates, ':lb')] });
  const days = diffDays(range.start, range.end) + 1;
  const width = days * px;
  const height = HEAD + rows.length * ROW;
  const ticks: IsoDate[] = [];
  for (let d = range.start; d <= range.end; d = addDays(d, scale === 'semana' ? 7 : 14)) ticks.push(d);
  const months = monthStarts(range.start, range.end);
  const statusX = diffDays(range.start, derived.statusDate) * px;

  const toggle = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card
      title={`Gantt ${baseline ? `· linha de base v${baseline.version}` : '· sem linha de base'}`}
      actions={
        <div className="tb-tabs" role="group" aria-label="Escala" style={{ marginBottom: 0 }}>
          {(Object.keys(SCALES) as Scale[]).map((s) => (
            <button key={s} type="button" aria-pressed={s === scale} className={s === scale ? 'active' : ''} onClick={() => setScale(s)}>
              {s}
            </button>
          ))}
        </div>
      }
    >
      <div
        className="tb-gantt"
        ref={(el) => {
          // Abre com a data de status à vista (uma vez por escala), sem brigar com a rolagem do usuário.
          if (!el || scrolledTo.current === scale) return;
          scrolledTo.current = scale;
          el.scrollLeft = Math.max(0, statusX - (el.clientWidth - LABEL_W) / 2);
        }}
      >
        <div className="tb-gantt-labels" style={{ width: LABEL_W }}>
          <div className="tb-gantt-label tb-hint" style={{ height: HEAD, fontWeight: 600, paddingLeft: 12, margin: 0 }}>
            Item
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              className="tb-gantt-label"
              style={{ height: ROW, paddingLeft: 12, background: i % 2 ? 'var(--surface-sunken)' : undefined }}
            >
              <span style={{ width: r.kind === 'wbs' ? r.depth * 14 : 0, flex: 'none' }} />
              {r.kind === 'wbs' && r.group ? (
                <button type="button" className="icon" style={{ width: 20, minHeight: 20 }} aria-label={`${collapsed.has(r.id) ? 'Expandir' : 'Recolher'} ${r.code}`} onClick={() => toggle(r.id)}>
                  {collapsed.has(r.id) ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                </button>
              ) : (
                <span style={{ width: 20, flex: 'none' }} />
              )}
              <span className="tb-mono tb-hint" style={{ margin: 0, flex: 'none' }}>{r.code}</span>
              <span style={{ fontWeight: r.kind === 'wbs' && r.group ? 600 : 400, overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>
                {r.name}
              </span>
            </div>
          ))}
        </div>
        <svg width={width} height={height} role="img" aria-label="Gráfico de Gantt" style={{ display: 'block', flex: 'none' }}>
          {rows.map((r, i) => (
            <rect key={`bg-${r.id}`} x={0} y={HEAD + i * ROW} width={width} height={ROW} fill={i % 2 ? '#f9fafb' : '#ffffff'} />
          ))}
          <rect x={0} y={0} width={width} height={HEAD} fill="var(--surface-sunken)" />
          <line x1={0} x2={width} y1={HEAD - 0.5} y2={HEAD - 0.5} stroke="var(--line)" />
          {months.map((m) => {
            const x = diffDays(range.start, m.date) * px;
            return (
              <g key={m.date}>
                <line x1={x} x2={x} y1={0} y2={height} stroke="#dfe5ec" />
                <text x={x + 6} y={17} fontSize={11} fontWeight={600} fill="var(--ink)">
                  {m.label}
                </text>
              </g>
            );
          })}
          {ticks.map((t) => {
            const x = diffDays(range.start, t) * px;
            return (
              <g key={t}>
                <line x1={x} x2={x} y1={HEAD} y2={height} stroke="#eef1f5" />
                <text x={x + 3} y={36} fontSize={10} fill="var(--ink-soft)" fontFamily="var(--mono)">
                  {formatDateBR(t).slice(0, 5)}
                </text>
              </g>
            );
          })}
          {rows.map((r, i) => {
            const y = HEAD + i * ROW;
            const mid = y + ROW / 2;
            const plan = layout[r.id];
            const lb = layout[`${r.id}:lb`];
            const critical = r.kind === 'wbs' ? schedule.tasks[r.id]?.critical : derived.milestones[r.id]?.critical;
            const palette = critical ? COLORS.critical : COLORS.plan;
            const zero = r.kind === 'milestone' || (r.kind === 'wbs' && r.zero);
            const dates = planned[r.id];
            const tip = `${r.code} ${r.name}${dates ? ` — ${formatDateBR(dates.start)} a ${formatDateBR(dates.finish)}` : ''}${
              r.kind === 'wbs' && r.percent !== null ? ` · ${formatPercent(r.percent)}` : ''
            }${critical ? ' · crítico' : ''}`;
            const group = r.kind === 'wbs' && r.group;
            return (
              <g key={r.id} data-testid={`gantt-row-${r.code}`}>
                <title>{tip}</title>
                {lb && !zero && <rect x={lb.x} y={mid + 7} width={lb.width} height={3} rx={1.5} fill={COLORS.baseline} />}
                {lb && zero && <rect x={lb.x - 4} y={mid + 2} width={8} height={8} fill="none" stroke={COLORS.baseline} strokeWidth={1.5} transform={`rotate(45 ${lb.x} ${mid + 6})`} />}
                {plan && !zero && group && (
                  <path
                    d={`M${plan.x} ${mid - 5} h${plan.width} v9 l-4 -4 H${plan.x + 4} l-4 4 Z`}
                    fill={COLORS.group}
                  />
                )}
                {plan && !zero && !group && (
                  <>
                    <rect x={plan.x} y={mid - 7} width={plan.width} height={13} rx={1} fill={palette.base} />
                    {r.kind === 'wbs' && r.percent ? (
                      <rect x={plan.x} y={mid - 7} width={(plan.width * Math.min(100, r.percent)) / 100} height={13} rx={1} fill={palette.done} />
                    ) : null}
                  </>
                )}
                {plan && zero && (
                  <rect
                    x={plan.x - 6}
                    y={mid - 6}
                    width={12}
                    height={12}
                    rx={2}
                    fill={r.kind === 'milestone' && !r.done ? 'var(--surface)' : palette.done}
                    stroke={palette.done}
                    strokeWidth={2}
                    transform={`rotate(45 ${plan.x} ${mid})`}
                  />
                )}
              </g>
            );
          })}
          <line x1={statusX} x2={statusX} y1={HEAD} y2={height} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" />
          <rect x={statusX - 30} y={HEAD - 12} width={60} height={16} rx={2} fill="var(--amber)" />
          <text x={statusX} y={HEAD - 1} fontSize={10} fontWeight={600} fill="#fff" textAnchor="middle" fontFamily="var(--mono)">
            {formatDateBR(derived.statusDate).slice(0, 5)}
          </text>
        </svg>
      </div>
      <div className="tb-gantt-legend">
        <span>
          <i className="tb-swatch" style={{ background: COLORS.plan.done }} /> Planejado (parte cheia = % físico)
        </span>
        <span>
          <i className="tb-swatch" style={{ background: COLORS.critical.done }} /> Caminho crítico
        </span>
        <span>
          <i className="tb-swatch" style={{ background: COLORS.baseline, height: 3 }} /> Linha de base
        </span>
        <span>◆ Marco (vazado = não realizado) ou pacote de duração 0</span>
        <span>
          <i className="tb-swatch" style={{ background: 'var(--amber)', width: 3, height: 12 }} /> Data de status
        </span>
      </div>
    </Card>
  );
}
