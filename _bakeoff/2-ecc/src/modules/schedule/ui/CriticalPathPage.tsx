import { formatDateBR } from '@/shared/lib/dates';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { KpiTile } from '@/shared/ui/KpiTile';
import { useSnapshot, useDerived } from '@/platform/react/hooks';

export function CriticalPathPage() {
  const snapshot = useSnapshot();
  const derived = useDerived();
  if (!snapshot || !derived) return null;
  const { schedule } = derived;
  if (!schedule.ok) {
    const codes = schedule.cycle.map((id) => snapshot.scope.wbs[id as never]?.code ?? id);
    return (
      <div role="alert" className="tb-alert-box">
        Dependência circular entre os pacotes {codes.join(' → ')}: o caminho crítico não pode ser calculado.
      </div>
    );
  }
  const rows = Object.values(schedule.tasks)
    .map((t) => ({ t, node: snapshot.scope.wbs[t.id as never] }))
    .filter((r) => r.node)
    .sort((a, b) => a.t.totalFloat - b.t.totalFloat || a.t.start.localeCompare(b.t.start));
  const critical = rows.filter((r) => r.t.critical);
  const chain = [...critical].sort((a, b) => a.t.start.localeCompare(b.t.start));
  return (
    <>
      {rows.length > 0 && (
        <div className="tb-grid" style={{ marginBottom: 16 }}>
          <KpiTile label="Término do projeto" value={formatDateBR(schedule.projectFinish)} />
          <KpiTile label="Pacotes críticos" value={`${critical.length} / ${rows.length}`} hint="Folga total 0" />
        </div>
      )}
      <Card title={`Caminho crítico — término do projeto ${formatDateBR(schedule.projectFinish)}`}>
        {!rows.length && <p className="tb-empty">Cadastre pacotes de trabalho na EAP para calcular o caminho crítico.</p>}
        {rows.length > 0 && (
          <>
            <p className="tb-hint">{critical.length} pacote(s) crítico(s) — folga total 0.</p>
            {chain.length > 0 && (
              <ol aria-label="Sequência crítica" className="tb-row" style={{ listStyle: 'none', padding: 0, margin: '4px 0 16px', gap: 6 }}>
                {chain.map(({ t, node }, i) => (
                  <li key={t.id} className="tb-row" style={{ gap: 6 }}>
                    <span className="tb-badge" style={{ background: 'var(--red-soft)', color: 'var(--red)' }}>
                      <span className="tb-mono">{node!.code}</span>
                      {node!.name}
                    </span>
                    {i < chain.length - 1 && (
                      <span aria-hidden="true" style={{ color: 'var(--line-strong)' }}>
                        →
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            )}
            <div className="tb-table-wrap">
              <table className="tb-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Pacote</th>
                    <th>Início</th>
                    <th>Término</th>
                    <th>Folga total</th>
                    <th>Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ t, node }) => (
                    <tr key={t.id}>
                      <td className="tb-mono">{node!.code}</td>
                      <td>{node!.name}</td>
                      <td className="tb-mono">{formatDateBR(t.start)}</td>
                      <td className="tb-mono">{formatDateBR(t.finish)}</td>
                      <td className="tb-mono">{t.totalFloat} d</td>
                      <td>{t.critical ? <Badge text="Crítico" tone="red" dot /> : <Badge text="Com folga" tone="gray" />}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>
    </>
  );
}
