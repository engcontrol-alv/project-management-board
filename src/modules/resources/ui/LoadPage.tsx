import { useState } from 'react';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import { useAnalysis } from '@/platform/react/hooks';
import { LoadHistogram } from './LoadHistogram';

/** Capacidade × demanda por semana (SPEC §6.6). */
export function LoadPage() {
  const analysis = useAnalysis();
  const [picked, setPicked] = useState<string | null>(null);
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  const load = (derived.resources?.load ?? []).filter((l) => l.weeks.some((w) => w.demandPct > 0));
  if (load.length === 0)
    return (
      <div>
        <div className="page-head">
          <h1 style={{ flex: 1 }}>Carga de recursos</h1>
        </div>
        <div className="card tb-card empty-state">Cadastre alocações para ver a carga semanal.</div>
      </div>
    );
  const name = (id: string) => snapshot.resources.resources[id as never]?.name ?? id;
  const defaultId = load.find((l) => l.weeks.some((w) => w.overPct !== null))?.resourceId ?? load[0]!.resourceId;
  const current = load.find((l) => l.resourceId === (picked ?? defaultId)) ?? load[0]!;

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Carga de recursos</h1>
        <label className="row small">
          Recurso
          <select className="input" value={current.resourceId} onChange={(e) => setPicked(e.target.value)}>
            {load.map((l) => (
              <option key={l.resourceId} value={l.resourceId}>
                {name(l.resourceId)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="card tb-card">
        <div className="gantt-legend" style={{ marginBottom: 8 }}>
          <span>
            <i style={{ background: 'var(--navy)' }} />
            Demanda
          </span>
          <span>
            <i style={{ background: 'var(--amber)', height: 2 }} />
            Capacidade <span className="tb-mono">{formatPercent(current.weeks[0]?.capacityPct ?? 100)}</span>
          </span>
          <span>
            <i style={{ background: 'var(--red)' }} />
            Acima da capacidade (hachurado)
          </span>
        </div>
        <LoadHistogram weeks={current.weeks} />
      </div>
      <div className="card tb-card flush">
        <DataTable
          label="Carga semanal"
          rows={current.weeks.map((w) => ({ ...w, id: w.week }))}
          columns={[
            { key: 'week', label: 'Semana', mono: true, render: (w) => formatDateBR(w.week) },
            { key: 'demand', label: 'Demanda', mono: true, render: (w) => formatPercent(w.demandPct) },
            { key: 'capacity', label: 'Capacidade', mono: true, render: (w) => formatPercent(w.capacityPct) },
            {
              key: 'status',
              label: 'Situação',
              render: (w) => <StatusBadge status={w.overPct !== null ? 'Sobrealocado' : 'Dentro da capacidade'} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
