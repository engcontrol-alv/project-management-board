import { formatDateBR } from '@/shared/lib/dates';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge, StatusBadge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import { KpiTile } from '@/shared/ui/KpiTile';
import { supplierPanel } from '@/analytics/supplier-panel';
import { useAnalysis } from '@/platform/react/hooks';
import { quadrant } from '../domain/engagement';
import type { Organization } from '../model/party';

const isSupplier = (o: Organization) => o.roles.includes('Fornecedor') || o.roles.includes('Prestador de serviço');

/** Ficha de cada fornecedor: projeção das contratações e riscos (nunca cópia) — SPEC §6.7. */
export function SuppliersPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived, config } = analysis;
  const currency = config.settings.finances.baseCurrency;
  const suppliers = Object.values(snapshot.stakeholders.parties)
    .filter((p): p is Organization => p.kind === 'Organização' && isSupplier(p))
    .sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Fornecedores</h1>
      </div>
      {!config.enabled.finances && (
        <p className="notice">Finanças desligado — ligue o módulo em Configurações para ver contratações e totais.</p>
      )}
      {suppliers.length === 0 && (
        <div className="card tb-card empty-state">Nenhuma organização com papel Fornecedor ou Prestador de serviço.</div>
      )}
      {suppliers.map((o) => {
        const panel = supplierPanel(snapshot, derived, o.id);
        const label = `${o.code} ${o.name}`;
        return (
          <section key={o.id} className="card tb-card" aria-label={label}>
            <div className="card-head">
              <h2>
                <span className="tb-mono muted">{o.code}</span> {o.name}
              </h2>
              {o.analysis && <StatusBadge status={quadrant(o.analysis)} />}
              {panel.highlighted && <Badge text="Comprometido acima do limite" tone="amber" />}
            </div>
            {config.enabled.finances && (
              <>
                <div className="grid" style={{ marginBottom: 12 }}>
                  <KpiTile label="Orçado" value={formatMoneyBR(panel.totals.budgeted, currency)} />
                  <KpiTile label="Comprometido" value={formatMoneyBR(panel.totals.committed, currency)} />
                  <KpiTile label="Realizado" value={formatMoneyBR(panel.totals.actual, currency)} />
                </div>
                <DataTable
                  rows={panel.procurements}
                  empty="Nenhuma contratação com este fornecedor."
                  columns={[
                    { key: 'code', label: 'Código', mono: true },
                    { key: 'description', label: 'Contratação' },
                    { key: 'deliveryStatus', label: 'Entrega', render: (p) => <StatusBadge status={p.deliveryStatus} /> },
                    { key: 'dueDate', label: 'Prazo', mono: true, render: (p) => formatDateBR(p.dueDate) },
                    { key: 'late', label: 'Situação', render: (p) => <StatusBadge status={p.late ? 'Atrasada' : 'Em dia'} /> },
                  ]}
                />
              </>
            )}
            <p className="small" style={{ marginBottom: 0 }}>
              <span className="muted">Riscos vinculados: </span>
              {panel.risks.length === 0
                ? '—'
                : panel.risks.map((id) => {
                    const r = snapshot.risks.risks[id];
                    return r ? `${r.code} ${r.title}` : id;
                  }).join(' · ')}
            </p>
          </section>
        );
      })}
    </div>
  );
}
