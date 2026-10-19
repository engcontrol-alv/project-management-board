import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { currentBaseline } from '@/analytics/derive';
import { useAnalysis } from '@/platform/react/hooks';

/** Curva S física (sem Finanças): % planejado na LB × % realizado. */
export function SCurvePage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  if (!currentBaseline(snapshot)) return <p className="info">Defina a linha de base para ver a Curva S.</p>;
  const data = derived.sCurve;
  if (data.length === 0) return <p className="muted">A linha de base não tem pacotes com duração.</p>;
  return (
    <div className="card">
      <h2>Curva S física</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Na data de status: realizado <span className="tb-mono">{formatPercent(derived.progress.actual)}</span> × planejado{' '}
        <span className="tb-mono">{formatPercent(derived.progress.planned)}</span> — SPI físico{' '}
        <span className="tb-mono">{formatRatio(derived.progress.spi)}</span>.
      </p>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={(d: string) => formatDateBR(d).slice(0, 5)} fontSize={11} />
            <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} fontSize={11} />
            <Tooltip labelFormatter={(d) => formatDateBR(String(d))} formatter={(v) => formatPercent(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="planned" name="Planejado (LB)" stroke="#9aa7b4" strokeDasharray="5 4" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="actual" name="Realizado" stroke="var(--primary)" strokeWidth={2} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details>
        <summary className="small">Tabela de dados</summary>
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>Planejado</th>
              <th>Realizado</th>
            </tr>
          </thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.date}>
                <td className="tb-mono">{formatDateBR(p.date)}</td>
                <td className="tb-mono">{formatPercent(p.planned)}</td>
                <td className="tb-mono">{p.actual === null ? '—' : formatPercent(p.actual)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
