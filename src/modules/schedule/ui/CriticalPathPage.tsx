import { compareCodes } from '@/shared/lib/codes';
import { formatDateBR } from '@/shared/lib/dates';
import { formatDays } from '@/shared/lib/format';
import { useAnalysis } from '@/platform/react/hooks';

export function CriticalPathPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  const sched = derived.schedule;
  if (!sched.ok) return <div className="errors">A EAP tem dependência circular; o caminho crítico não pode ser calculado.</div>;
  const rows = Object.values(snapshot.scope.wbs)
    .filter((n) => n.kind === 'Pacote de trabalho' && sched.tasks[n.id]?.critical)
    .sort((a, b) => compareCodes(a.code, b.code));
  return (
    <div className="card">
      <h2>Caminho crítico</h2>
      <p className="muted small">
        Pacotes com folga total zero. Término previsto do projeto: <span className="tb-mono">{formatDateBR(sched.projectFinish)}</span>
      </p>
      {rows.length === 0 ? (
        <p className="muted">Nenhum pacote de trabalho cadastrado.</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Código</th>
              <th>Pacote</th>
              <th>Início</th>
              <th>Término</th>
              <th>Folga total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((n) => {
              const t = sched.tasks[n.id]!;
              return (
                <tr key={n.id}>
                  <td className="tb-mono">{n.code}</td>
                  <td>{n.name}</td>
                  <td className="tb-mono">{formatDateBR(t.start)}</td>
                  <td className="tb-mono">{formatDateBR(t.finish)}</td>
                  <td className="tb-mono">{formatDays(t.totalFloat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
