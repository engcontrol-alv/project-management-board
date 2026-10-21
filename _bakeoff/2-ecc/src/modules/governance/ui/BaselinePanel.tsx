import { useState } from 'react';
import { formatDateBR } from '@/shared/lib/dates';
import { Card } from '@/shared/ui/Card';
import { defineInitialBaseline } from '@/commands/baseline';
import { useCommand, useReadOnly, useSnapshot } from '@/platform/react/hooks';

/** Linha de base: v1 por ação explícita; versões anteriores consultáveis somente leitura. */
export function BaselinePanel() {
  const snapshot = useSnapshot();
  const run = useCommand();
  const readOnly = useReadOnly();
  const [error, setError] = useState<string | null>(null);
  if (!snapshot) return null;
  const versions = [...snapshot.baselines].sort((a, b) => b.version - a.version);
  const current = versions[0];
  const wbs = snapshot.scope.wbs as Record<string, { code: string; name: string }>;
  const milestones = snapshot.schedule.milestones as Record<string, { code: string; name: string }>;
  const crCode = (id: string | null) =>
    id ? ((snapshot.scope.changeRequests as Record<string, { code: string }>)[id]?.code ?? 'mudança') : null;

  return (
    <Card title="Linha de base">
      {error && (
        <div role="alert" className="tb-error">
          {error}
        </div>
      )}
      {!current && (
        <>
          <p className="tb-hint">
            Sem linha de base: PV, SPI e desvios ficam n/a. Defina quando o plano estiver pronto; depois disso ela só muda por
            mudança aprovada.
          </p>
          {!readOnly && (
            <button
              type="button"
              className="primary"
              onClick={async () => {
                const r = await run(defineInitialBaseline());
                setError(r.ok ? null : r.error.join(' '));
              }}
            >
              Definir linha de base
            </button>
          )}
        </>
      )}
      {current && (
        <p>
          <strong>Linha de base v{current.version}</strong>{' '}
          <span className="tb-hint">
            vigente desde {formatDateBR(current.createdAt.slice(0, 10))}
            {current.changeRequestId ? ` · ${crCode(current.changeRequestId)}` : ''} · término previsto{' '}
            {formatDateBR(current.projectFinish)}
          </span>
        </p>
      )}
      {versions.map((b) => (
        <details key={b.id} style={{ marginTop: 8 }}>
          <summary style={{ cursor: 'pointer', fontSize: 13, color: 'var(--ink-soft)' }}>
            v{b.version} — {formatDateBR(b.createdAt.slice(0, 10))}
            {b.changeRequestId ? ` — ${crCode(b.changeRequestId)}` : ' — inicial'}
          </summary>
          <div className="tb-table-wrap" style={{ marginTop: 8 }}>
          <table className="tb-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Início</th>
                <th>Término / data</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(b.workPackages).map(([id, w]) => (
                <tr key={id}>
                  <td>{wbs[id] ? `${wbs[id].code} ${wbs[id].name}` : 'Pacote excluído'}</td>
                  <td className="tb-mono">{formatDateBR(w.start)}</td>
                  <td className="tb-mono">{formatDateBR(w.finish)}</td>
                </tr>
              ))}
              {Object.entries(b.milestones).map(([id, m]) => (
                <tr key={id}>
                  <td>{milestones[id] ? `${milestones[id].code} ${milestones[id].name}` : 'Marco excluído'}</td>
                  <td>—</td>
                  <td className="tb-mono">{formatDateBR(m.date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </details>
      ))}
    </Card>
  );
}
