import { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { compareCodes } from '@/shared/lib/codes';
import { addDays, diffDays, formatDateBR, maxDate, minDate, type IsoDate } from '@/shared/lib/dates';
import { currentBaseline } from '@/analytics/derive';
import { useAnalysis } from '@/platform/react/hooks';
import { ganttLayout } from './gantt-layout';

const ROW = 30;
const HEAD = 44;
const SCALES = { semana: 14, mês: 4 } as const;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type Row = {
  id: string;
  code: string;
  name: string;
  depth: number;
  kind: 'group' | 'package' | 'milestone';
  start: IsoDate | null;
  finish: IsoDate | null;
  percent: number | null;
  zero: boolean;
  critical: boolean;
  base?: { start: IsoDate; finish: IsoDate };
};

/** Gantt somente leitura: plano atual sobre a LB (cinza), críticos em vermelho, linha da data de status. */
export function GanttPage() {
  const analysis = useAnalysis();
  const [scale, setScale] = useState<keyof typeof SCALES>('semana');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const scroller = useRef<HTMLDivElement>(null);
  const statusOffset = useRef(0);
  // Abre a linha do tempo no período atual (data de status), não no início do projeto.
  useLayoutEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = Math.max(0, statusOffset.current - 160);
  }, [scale]);
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  const sched = derived.schedule;
  if (!sched.ok) return <div className="errors">A EAP tem dependência circular; o Gantt não pode ser exibido.</div>;
  const baseline = currentBaseline(snapshot);

  const nodes = Object.values(snapshot.scope.wbs).sort((a, b) => compareCodes(a.code, b.code));
  const hidden = (parentId: string | null): boolean => {
    let p = parentId;
    while (p) {
      if (collapsed.has(p)) return true;
      p = snapshot.scope.wbs[p as keyof typeof snapshot.scope.wbs]?.parentId ?? null;
    }
    return false;
  };
  const rows: Row[] = nodes
    .filter((n) => !hidden(n.parentId))
    .map((n) => {
      const isGroup = n.kind === 'Agrupador';
      const t = sched.tasks[n.id];
      const g = derived.groups[n.id];
      const b = baseline?.workPackages[n.id];
      return {
        id: n.id,
        code: n.code,
        name: n.name,
        depth: n.code.split('.').length - 1,
        kind: isGroup ? 'group' : 'package',
        start: isGroup ? (g?.start ?? null) : (t?.start ?? null),
        finish: isGroup ? (g?.finish ?? null) : (t?.finish ?? null),
        percent: isGroup ? (g?.percent ?? null) : n.percentComplete,
        zero: !isGroup && n.duration === 0,
        critical: t?.critical ?? false,
        base: b ? { start: b.start, finish: b.finish } : undefined,
      };
    });
  for (const m of Object.values(snapshot.schedule.milestones).sort((a, b) => compareCodes(a.code, b.code))) {
    const d = derived.milestones[m.id];
    const date = m.actualDate ?? d?.forecast ?? null;
    const b = d?.baselineDate;
    rows.push({
      id: m.id,
      code: m.code,
      name: m.name,
      depth: 0,
      kind: 'milestone',
      start: date,
      finish: date,
      percent: null,
      zero: true,
      critical: d?.critical ?? false,
      base: b ? { start: b, finish: b } : undefined,
    });
  }

  const dates = rows.flatMap((r) => [r.start, r.finish, r.base?.start, r.base?.finish]).filter((d): d is IsoDate => !!d);
  if (dates.length === 0)
    return (
      <div className="card empty-state">
        <p style={{ margin: 0 }}>Cadastre pacotes de trabalho na EAP para ver o Gantt.</p>
      </div>
    );
  const rangeStart = addDays(minDate(...dates, derived.statusDate), -3);
  const rangeEnd = addDays(maxDate(...dates, derived.statusDate), 10);
  const px = SCALES[scale];
  const width = (diffDays(rangeStart, rangeEnd) + 1) * px;
  const layout = (pick: (r: Row) => { start: IsoDate; finish: IsoDate } | undefined) =>
    ganttLayout({
      rangeStart,
      rangeEnd,
      pxPerDay: px,
      bars: rows.flatMap((r) => {
        const v = pick(r);
        return v ? [{ id: r.id, start: v.start, finish: v.finish, zeroDuration: r.zero }] : [];
      }),
    });
  const plan = layout((r) => (r.start && r.finish ? { start: r.start, finish: r.finish } : undefined));
  const base = layout((r) => r.base);
  const xOf = (d: IsoDate) => diffDays(rangeStart, d) * px;

  // Faixa superior: meses; inferior: semanas (ou meses, na escala mensal).
  const months: { x: number; label: string }[] = [];
  for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 1))
    if (d === rangeStart || d.endsWith('-01'))
      months.push({ x: xOf(d), label: `${MONTHS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}` });
  const ticks: IsoDate[] = [];
  if (scale === 'semana') for (let d = rangeStart; d <= rangeEnd; d = addDays(d, 7)) ticks.push(d);
  const statusX = xOf(derived.statusDate);
  statusOffset.current = statusX;
  const height = HEAD + rows.length * ROW;

  const toggle = (id: string) => {
    const next = new Set(collapsed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCollapsed(next);
  };

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Gantt</h1>
        <div className="segmented" role="group" aria-label="Escala">
          {(Object.keys(SCALES) as (keyof typeof SCALES)[]).map((s) => (
            <button key={s} aria-pressed={s === scale} onClick={() => setScale(s)}>
              {s === 'semana' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
      </div>
      <div className="gantt-legend" style={{ marginBottom: 10 }}>
        <span>
          <i style={{ background: 'var(--primary)' }} />
          Plano atual
        </span>
        <span>
          <i style={{ background: 'var(--red)' }} />
          Caminho crítico
        </span>
        <span>
          <i style={{ background: '#aeb9c5', height: 4 }} />
          Linha de base {baseline ? `v${baseline.version}` : '(não definida)'}
        </span>
        <span>
          <i style={{ background: 'var(--amber)', width: 2, height: 12 }} />
          Data de status · <span className="tb-mono">{formatDateBR(derived.statusDate)}</span>
        </span>
      </div>
      {/* Coluna de nomes fixa; só a linha do tempo rola na horizontal. */}
      <div className="card flush" style={{ display: 'flex' }}>
        <div className="gantt-labels" style={{ flex: 'none', width: 'clamp(150px, 32vw, 300px)', borderRight: '1px solid var(--line)' }}>
          <div style={{ height: HEAD, borderBottom: '1px solid var(--line)', background: 'var(--surface-2)', display: 'flex', alignItems: 'flex-end', padding: '0 12px 8px' }}>
            <span className="eyebrow">Item da EAP / marco</span>
          </div>
          {rows.map((r, i) => (
            <div
              key={r.id}
              style={{
                height: ROW,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: `0 12px 0 ${12 + r.depth * 14}px`,
                background: i % 2 ? 'var(--surface-2)' : 'var(--surface)',
                fontSize: 13,
                fontWeight: r.kind === 'group' ? 600 : 400,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
              }}
            >
              {r.kind === 'group' ? (
                <button
                  className="btn-link"
                  style={{ display: 'inline-flex', color: 'var(--ink-soft)' }}
                  aria-label={collapsed.has(r.id) ? `Expandir ${r.code} ${r.name}` : `Recolher ${r.code} ${r.name}`}
                  aria-expanded={!collapsed.has(r.id)}
                  onClick={() => toggle(r.id)}
                >
                  {collapsed.has(r.id) ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
              ) : (
                <span style={{ width: 14 }} />
              )}
              <span className="tb-mono muted" style={{ fontSize: 12 }}>
                {r.code}
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }} title={r.name}>
                {r.name}
              </span>
            </div>
          ))}
        </div>
        <div className="table-wrap gantt-timeline" style={{ flex: 1, minWidth: 0 }} ref={scroller}>
          <svg width={width} height={height} role="img" aria-label="Gráfico de Gantt" style={{ display: 'block', fontSize: 11 }}>
            <rect x={0} y={0} width={width} height={HEAD} fill="var(--surface-2)" />
            <line x1={0} x2={width} y1={HEAD} y2={HEAD} stroke="var(--line)" />
            {rows.map((r, i) => (i % 2 ? <rect key={`z${r.id}`} x={0} y={HEAD + i * ROW} width={width} height={ROW} fill="var(--surface-2)" /> : null))}
            {months.map((m) => (
              <g key={m.label + m.x}>
                <line x1={m.x} x2={m.x} y1={0} y2={height} stroke="var(--line)" />
                <text x={m.x + 6} y={16} fill="var(--ink)" fontWeight={600}>
                  {m.label}
                </text>
              </g>
            ))}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={xOf(t)} x2={xOf(t)} y1={HEAD - 10} y2={height} stroke="var(--line)" strokeDasharray="2 4" />
                <text x={xOf(t) + 3} y={HEAD - 8} fill="var(--ink-soft)" className="tb-mono" fontSize={10.5}>
                  {formatDateBR(t).slice(0, 5)}
                </text>
              </g>
            ))}
            {rows.map((r, i) => {
              const y = HEAD + i * ROW;
              const p = plan[r.id];
              const b = base[r.id];
              const color = r.critical ? 'var(--red)' : 'var(--primary)';
              return (
                <g key={r.id} data-row={r.id}>
                  <title>
                    {`${r.code} ${r.name}: ${formatDateBR(r.start)} – ${formatDateBR(r.finish)}${r.critical ? ' · crítico' : ''}`}
                  </title>
                  {b && !r.zero && <rect x={b.x} y={y + 21} width={b.width} height={4} fill="#aeb9c5" rx={2} />}
                  {b && r.zero && <Diamond cx={b.x} cy={y + 15} color="#aeb9c5" size={5} />}
                  {p && r.kind === 'group' && (
                    <path
                      d={`M${p.x} ${y + 10} h${p.width} v8 l-4 -4 h${-(p.width - 8)} l-4 4 z`}
                      fill="var(--ink-soft)"
                    />
                  )}
                  {p && r.kind === 'package' && !r.zero && (
                    <>
                      <rect x={p.x} y={y + 7} width={p.width} height={12} rx={3} fill={color} opacity={0.28} />
                      <rect x={p.x} y={y + 7} width={(p.width * Math.min(100, r.percent ?? 0)) / 100} height={12} rx={3} fill={color} />
                    </>
                  )}
                  {p && r.zero && <Diamond cx={p.x} cy={y + 13} color={r.kind === 'milestone' && !r.critical ? 'var(--ink)' : color} size={7} />}
                </g>
              );
            })}
            <line x1={statusX} x2={statusX} y1={HEAD - 4} y2={height} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function Diamond({ cx, cy, color, size }: { cx: number; cy: number; color: string; size: number }) {
  return <polygon points={`${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}`} fill={color} />;
}
