import { useState } from 'react';
import { formatMoneyBR } from '@/shared/lib/money';
import { StatusBadge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import { useAnalysis } from '@/platform/react/hooks';
import { bandOf, exposure, isOpen } from '../domain/exposure';
import { IMPACT_LABELS, PROBABILITY_LABELS, type Risk } from '../model/risk';
import { BAND_TONE, ExposureBadge } from './ExposureBadge';

const LEVELS = [1, 2, 3] as const;

/** Matriz P × I 3×3 (D2): probabilidade no eixo vertical, Alta em cima; clicar filtra a tabela. */
export function RiskMatrixPage() {
  const analysis = useAnalysis();
  const [cell, setCell] = useState<string | null>(null);
  if (!analysis) return null;
  const { snapshot, derived, config } = analysis;
  const settings = config.settings.risks;
  const matrix = derived.risks?.matrix ?? { cells: {}, unassessed: [] };
  const all = Object.values(snapshot.risks.risks);
  const byId = (ids: string[]) => ids.map((id) => snapshot.risks.risks[id as never]).filter((r): r is Risk => !!r);
  const selected = (cell ? byId(matrix.cells[cell] ?? []) : all.filter((r) => r.probability !== null && r.impact !== null)).sort(
    (a, b) => a.code.localeCompare(b.code),
  );
  const currency = config.settings.finances.baseCurrency;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Matriz de riscos</h1>
        {cell && (
          <button className="btn btn-sm btn-ghost" onClick={() => setCell(null)}>
            Limpar filtro
          </button>
        )}
      </div>
      <div className="split">
        <div className="card tb-card">
          <table className="risk-matrix" role="grid" aria-label="Matriz probabilidade × impacto">
            <tbody>
              {[...LEVELS].reverse().map((p) => (
                <tr key={p}>
                  <th scope="row" className="tb-caption">
                    {PROBABILITY_LABELS[p]}
                  </th>
                  {LEVELS.map((i) => {
                    const key = `${p}-${i}`;
                    const ids = matrix.cells[key] ?? [];
                    const open = byId(ids).filter(isOpen).length;
                    const band = bandOf(p * i, settings.bands);
                    return (
                      <td key={key}>
                        <button
                          className={`risk-cell tone-${BAND_TONE[band]}`}
                          aria-pressed={cell === key}
                          aria-label={`Probabilidade ${PROBABILITY_LABELS[p]}, impacto ${IMPACT_LABELS[i]}: ${ids.length} risco(s), ${band}`}
                          onClick={() => setCell(cell === key ? null : key)}
                        >
                          <span className="tb-mono risk-count">{ids.length}</span>
                          <span className="small">{band}</span>
                          {open !== ids.length && <span className="muted small">{open} aberto(s)</span>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th />
                {LEVELS.map((i) => (
                  <th key={i} scope="col" className="tb-caption">
                    {IMPACT_LABELS[i]}
                  </th>
                ))}
              </tr>
            </tfoot>
          </table>
          <p className="muted small" style={{ margin: '8px 0 0' }}>
            Probabilidade (linhas) × impacto (colunas).
          </p>
        </div>
        <section className="card tb-card flush" aria-label="Exposição por categoria">
          <div className="card-head" style={{ padding: '14px 18px 0' }}>
            <h2>Exposição por categoria</h2>
          </div>
          <DataTable
            rows={(derived.risks?.byCategory ?? []).map((c) => ({ ...c, id: c.category }))}
            empty="Nenhum risco aberto."
            columns={[
              { key: 'category', label: 'Categoria' },
              { key: 'count', label: 'Abertos', mono: true },
              { key: 'score', label: 'Pontuação', mono: true },
              { key: 'emv', label: 'Valor esperado', mono: true, render: (c) => formatMoneyBR(c.emv, currency) },
            ]}
          />
        </section>
      </div>
      <div className="card tb-card flush">
        <DataTable<Risk>
          label="Riscos da seleção"
          rows={selected}
          empty="Nenhum risco nesta célula."
          columns={[
            { key: 'code', label: 'Código', mono: true },
            { key: 'title', label: 'Risco' },
            { key: 'exposure', label: 'Exposição', render: (r) => <ExposureBadge value={exposure(r, settings)} /> },
            { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          ]}
        />
      </div>
      <section className="card tb-card" aria-label="Não avaliados">
        <h2>Não avaliados</h2>
        <p className="small" style={{ margin: 0 }}>
          {matrix.unassessed.length === 0 ? (
            <span className="muted">Todos os riscos têm probabilidade e impacto.</span>
          ) : (
            byId(matrix.unassessed).map((r) => `${r.code} ${r.title}`).join(' · ')
          )}
        </p>
      </section>
    </div>
  );
}
