import { useState } from 'react';
import { compareCodes } from '@/shared/lib/codes';
import { formatDateBR } from '@/shared/lib/dates';
import { Card } from '@/shared/ui/Card';
import { ErrorList } from '@/shared/ui/Dialog';
import { defineInitialBaseline } from '@/commands/baseline';
import { useCommand, useSnapshot } from '@/platform/react/hooks';
import { isReadOnly } from '../domain/governance';

export function BaselinePanel() {
  const snapshot = useSnapshot();
  const command = useCommand();
  const [errors, setErrors] = useState<string[]>([]);
  const [viewing, setViewing] = useState<number | null>(null);
  if (!snapshot) return null;
  const baselines = [...snapshot.baselines].sort((a, b) => b.version - a.version);
  const current = baselines[0];
  const crCode = (id: string | null) =>
    id ? (snapshot.scope.changeRequests[id as keyof typeof snapshot.scope.changeRequests]?.code ?? 'mudança') : 'inicial';
  const shown = baselines.find((b) => b.version === viewing);

  return (
    <Card title="Linha de base">
      <ErrorList errors={errors} />
      {!current ? (
        <>
          <p className="muted">Sem linha de base: SPI físico, Curva S e desvios ficam "n/a".</p>
          <button
            className="btn btn-primary"
            disabled={isReadOnly(snapshot.governance.profile)}
            onClick={async () => {
              const r = await command(defineInitialBaseline());
              setErrors(r.ok ? [] : r.error);
            }}
          >
            Definir linha de base
          </button>
        </>
      ) : (
        <>
          <p>
            <strong>Linha de base v{current.version}</strong> — término previsto{' '}
            <span className="tb-mono">{formatDateBR(current.projectFinish)}</span>. Só muda por "Aplicar à linha de base" numa
            mudança aprovada.
          </p>
          <table className="tbl small">
            <tbody>
              {baselines.map((b) => (
                <tr key={b.id}>
                  <td className="tb-mono">v{b.version}</td>
                  <td>{formatDateBR(b.createdAt.slice(0, 10))}</td>
                  <td className="tb-mono">{crCode(b.changeRequestId)}</td>
                  <td className="actions">
                    <button className="btn btn-sm" onClick={() => setViewing(viewing === b.version ? null : b.version)}>
                      {viewing === b.version ? 'Fechar' : `Consultar v${b.version}`}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {shown && (
            <div className="card" aria-label={`Linha de base v${shown.version} (somente leitura)`}>
              <h3>v{shown.version} — somente leitura</h3>
              <table className="tbl small">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Início</th>
                    <th>Término / data</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(shown.workPackages)
                    .map(([id, w]) => ({ id, w, code: snapshot.scope.wbs[id as keyof typeof snapshot.scope.wbs]?.code ?? '(excluído)' }))
                    .sort((a, b) => compareCodes(a.code, b.code))
                    .map(({ id, w, code }) => (
                      <tr key={id}>
                        <td className="tb-mono">{code}</td>
                        <td className="tb-mono">{formatDateBR(w.start)}</td>
                        <td className="tb-mono">{formatDateBR(w.finish)}</td>
                      </tr>
                    ))}
                  {Object.entries(shown.milestones).map(([id, m]) => (
                    <tr key={id}>
                      <td className="tb-mono">
                        {snapshot.schedule.milestones[id as keyof typeof snapshot.schedule.milestones]?.code ?? '(marco excluído)'}
                      </td>
                      <td />
                      <td className="tb-mono">{formatDateBR(m.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
