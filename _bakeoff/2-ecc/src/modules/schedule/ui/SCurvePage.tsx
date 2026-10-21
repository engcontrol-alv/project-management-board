import { Area, CartesianGrid, ComposedChart, Legend, Line, ReferenceLine, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { Card } from '@/shared/ui/Card';
import { KpiTile } from '@/shared/ui/KpiTile';
import { useDerived } from '@/platform/react/hooks';

const AXIS = { fontSize: 11, fill: '#78838d', fontFamily: 'IBM Plex Mono, monospace' };

/** Curva S física (sem Finanças): % planejado na LB × % realizado. */
export function SCurvePage() {
  const derived = useDerived();
  if (!derived) return null;
  if (!derived.sCurve.length) return <p className="tb-empty">Defina a linha de base para ver a Curva S.</p>;
  const data = derived.sCurve.map((p) => ({ ...p, label: formatDateBR(p.date) }));
  const status = data.find((p) => p.date >= derived.statusDate)?.label;
  return (
    <>
      <div className="tb-grid" style={{ marginBottom: 16 }}>
        <KpiTile label="% físico realizado" value={formatPercent(derived.progress.actual)} />
        <KpiTile label="% físico planejado" value={formatPercent(derived.progress.planned)} />
        <KpiTile label="SPI físico" value={formatRatio(derived.progress.spi)} hint="Realizado ÷ planejado na data de status" />
      </div>
      <Card title="Curva S física">
        <p className="tb-hint" style={{ marginTop: -6, marginBottom: 12 }}>
          Linha tracejada: planejado na linha de base. Área: realizado até a data de status.
        </p>
        <div style={{ overflowX: 'auto' }}>
            <ComposedChart width={900} height={340} data={data} margin={{ top: 8, right: 16, bottom: 4, left: -8 }}>
              <defs>
                <linearGradient id="scurve-actual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3f6d8f" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#3f6d8f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="#e0e6eb" vertical={false} />
              <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: '#e0e6eb' }} minTickGap={24} />
              <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} tick={AXIS} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={(v: number) => formatPercent(v)}
                contentStyle={{ borderRadius: 3, border: '1px solid #e0e6eb', boxShadow: 'none', fontSize: 12 }}
              />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 12 }} />
              {status && (
                <ReferenceLine
                  x={status}
                  stroke="#6f5fa0"
                  strokeDasharray="4 3"
                  label={{ value: 'status', fill: '#6f5fa0', fontSize: 10, position: 'insideTopRight' }}
                />
              )}
              <Line type="monotone" dataKey="planned" name="Planejado (LB)" stroke="#8792a0" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
              <Area type="monotone" dataKey="actual" name="Realizado" stroke="#3f6d8f" strokeWidth={2.5} fill="url(#scurve-actual)" connectNulls isAnimationActive={false} />
            </ComposedChart>
        </div>
      </Card>
      <Card title="Tabela da Curva S">
        <div className="tb-table-wrap" style={{ maxHeight: 360, overflowY: 'auto' }}>
          <table className="tb-table">
            <thead>
              <tr>
                <th>Data</th>
                <th style={{ textAlign: 'right' }}>Planejado</th>
                <th style={{ textAlign: 'right' }}>Realizado</th>
              </tr>
            </thead>
            <tbody>
              {derived.sCurve.map((p) => (
                <tr key={p.date}>
                  <td className="tb-mono">{formatDateBR(p.date)}</td>
                  <td className="tb-mono" style={{ textAlign: 'right' }}>
                    {formatPercent(p.planned)}
                  </td>
                  <td className="tb-mono" style={{ textAlign: 'right' }}>
                    {p.actual === null ? '—' : formatPercent(p.actual)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
