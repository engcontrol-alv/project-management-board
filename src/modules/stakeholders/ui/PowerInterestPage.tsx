import { useState } from 'react';
import { Badge, StatusBadge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import { supplierPanel } from '@/analytics/supplier-panel';
import { useAnalysis } from '@/platform/react/hooks';
import { hasEngagementGap, quadrant, type Quadrant } from '../domain/engagement';
import type { Party } from '../model/party';

/** Disposição da matriz: poder no eixo vertical (Alto em cima), interesse no horizontal. */
const GRID: { q: Quadrant; hint: string }[] = [
  { q: 'Manter satisfeito', hint: 'Poder alto · interesse baixo' },
  { q: 'Gerenciar de perto', hint: 'Poder alto · interesse alto' },
  { q: 'Monitorar', hint: 'Poder baixo · interesse baixo' },
  { q: 'Manter informado', hint: 'Poder baixo · interesse alto' },
];

type Row = Party & { analysis: NonNullable<Party['analysis']> };

export function PowerInterestPage() {
  const analysis = useAnalysis();
  const [filter, setFilter] = useState<Quadrant | null>(null);
  if (!analysis) return null;
  const { snapshot, derived, config } = analysis;
  const rows = Object.values(snapshot.stakeholders.parties)
    .filter((p): p is Row => p.analysis !== null)
    .sort((a, b) => a.code.localeCompare(b.code));
  const visible = filter ? rows.filter((p) => quadrant(p.analysis) === filter) : rows;
  const highlighted = (p: Party) => config.enabled.finances && p.kind === 'Organização' && supplierPanel(snapshot, derived, p.id).highlighted;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Matriz Poder × Interesse</h1>
      </div>
      <div className="pi-matrix" role="group" aria-label="Quadrantes">
        <span className="pi-axis pi-axis-y">Poder ↑</span>
        {GRID.map(({ q, hint }) => {
          const count = rows.filter((p) => quadrant(p.analysis) === q).length;
          return (
            <button
              key={q}
              className="pi-cell tb-card"
              aria-pressed={filter === q}
              onClick={() => setFilter(filter === q ? null : q)}
            >
              <span className="pi-cell-head">
                <strong>{q}</strong>
                <span className="tb-mono pi-count">{count}</span>
              </span>
              <span className="muted small">{hint}</span>
            </button>
          );
        })}
        <span className="pi-axis pi-axis-x">Interesse →</span>
      </div>
      <div className="card tb-card flush">
        <DataTable<Row>
          rows={visible}
          empty={rows.length === 0 ? 'Nenhuma parte analisada. Marque "Analisar" no cadastro.' : 'Nenhuma parte neste quadrante.'}
          columns={[
            { key: 'code', label: 'Código', mono: true },
            {
              key: 'name',
              label: 'Parte interessada',
              render: (p) => (
                <div>
                  {p.name}
                  {highlighted(p) && (
                    <div>
                      <Badge text="Comprometido acima do limite" tone="amber" />
                    </div>
                  )}
                </div>
              ),
            },
            { key: 'quadrant', label: 'Quadrante', render: (p) => <StatusBadge status={quadrant(p.analysis)} /> },
            {
              key: 'engagement',
              label: 'Engajamento',
              render: (p) =>
                hasEngagementGap(p.analysis) ? (
                  <span className="tb-mono">{`${p.analysis.currentPosture} → ${p.analysis.desiredPosture}`}</span>
                ) : (
                  <StatusBadge status={p.analysis.currentPosture} />
                ),
            },
            { key: 'strategy', label: 'Estratégia', render: (p) => p.analysis.engagementStrategy || <span className="muted">—</span> },
          ]}
        />
      </div>
    </div>
  );
}
