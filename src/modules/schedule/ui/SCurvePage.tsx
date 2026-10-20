import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { currentBaseline } from '@/analytics/derive';
import { useAnalysis } from '@/platform/react/hooks';

/** Curva S: monetária (PV × EV × AC) com Finanças ligado e BAC > 0; senão física (SPEC §6.3c). */
export function SCurvePage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  if (!currentBaseline(snapshot)) return <p className="info">Defina a linha de base para ver a Curva S.</p>;
  const f = derived.finances;
  if (f && f.evm.bac > 0 && f.moneySCurve.length > 0) return <MoneyCurve />;
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

function MoneyCurve() {
  const analysis = useAnalysis();
  const f = analysis?.derived.finances;
  if (!f) return null;
  const cur = f.baseCurrency;
  const money = (v: number | null) => (v === null ? '—' : formatMoneyBR(Math.round(v), cur));
  const short = (v: number) => formatMoneyBR(v, cur).replace(/,\d{2}$/, '');
  return (
    <div className="card">
      <h2>Curva S — PV × EV × AC</h2>
      <p className="muted small" style={{ marginTop: 0 }}>
        Na data de status: PV <span className="tb-mono">{money(f.evm.pv)}</span> · EV{' '}
        <span className="tb-mono">{money(f.evm.ev)}</span> · AC <span className="tb-mono">{money(f.evm.ac)}</span> — SPI{' '}
        <span className="tb-mono">{formatRatio(f.evm.spi)}</span> e CPI <span className="tb-mono">{formatRatio(f.evm.cpi)}</span>.
      </p>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <LineChart data={f.moneySCurve} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <CartesianGrid stroke="var(--line)" />
            <XAxis dataKey="date" tickFormatter={(d: string) => formatDateBR(d).slice(0, 5)} fontSize={11} />
            <YAxis tickFormatter={short} fontSize={11} width={96} />
            <Tooltip labelFormatter={(d) => formatDateBR(String(d))} formatter={(v) => money(Number(v))} />
            <Legend />
            <Line type="monotone" dataKey="pv" name="PV (planejado)" stroke="#9aa7b4" strokeDasharray="5 4" dot={false} strokeWidth={2} />
            <Line type="monotone" dataKey="ev" name="EV (agregado)" stroke="var(--primary)" strokeWidth={2} connectNulls={false} />
            <Line type="monotone" dataKey="ac" name="AC (real)" stroke="var(--red)" strokeWidth={2} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <details>
        <summary className="small">Tabela de dados</summary>
        <table className="tbl">
          <thead>
            <tr>
              <th>Data</th>
              <th>PV</th>
              <th>EV</th>
              <th>AC</th>
            </tr>
          </thead>
          <tbody>
            {f.moneySCurve.map((p) => (
              <tr key={p.date}>
                <td className="tb-mono">{formatDateBR(p.date)}</td>
                <td className="tb-mono">{money(p.pv)}</td>
                <td className="tb-mono">{money(p.ev)}</td>
                <td className="tb-mono">{money(p.ac)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
