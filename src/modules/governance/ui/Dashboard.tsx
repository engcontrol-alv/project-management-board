import { useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { Indicator } from '@/core/indicators';
import { formatDateBR } from '@/shared/lib/dates';
import { formatCount, formatDays, formatPercent, formatRatio } from '@/shared/lib/format';
import { RagBadge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { KpiTile } from '@/shared/ui/KpiTile';
import { ragTone } from '@/shared/ui/tones';
import { computeDashboard } from '@/analytics/dashboard';
import { currentBaseline } from '@/analytics/derive';
import { useAnalysis } from '@/platform/react/hooks';
import { NEW_CHANGE_REQUEST_PATH, RECORD_SECTIONS } from '@/registers/module-view';
import { BaselinePanel } from './BaselinePanel';

function formatKpi(k: Indicator): string {
  switch (k.format) {
    case 'ratio':
      return formatRatio(k.value);
    case 'percent':
      return formatPercent(k.value);
    case 'days':
      return formatDays(k.value);
    default:
      return formatCount(k.value);
  }
}

const clampPct = (n: number | null) => Math.max(0, Math.min(100, n ?? 0));

/** Elemento-assinatura do painel: avanço físico realizado sobre o planejado na linha de base. */
function ProgressRibbon({ actual, planned }: { actual: number | null; planned: number | null }) {
  return (
    <div aria-label="Avanço físico">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <span className="eyebrow">Avanço físico</span>
        <span className="tb-mono" style={{ fontSize: 22, letterSpacing: '-0.03em' }}>
          {formatPercent(actual)}
        </span>
      </div>
      <div
        className="meter"
        role="img"
        aria-label={`Realizado ${formatPercent(actual)}; planejado na linha de base ${formatPercent(planned)}`}
      >
        <span className="planned" style={{ width: `${clampPct(planned)}%` }} />
        <span className="actual" style={{ width: `${clampPct(actual)}%` }} />
      </div>
      <div className="gantt-legend" style={{ justifyContent: 'space-between', marginTop: 8 }}>
        <span>
          <i style={{ background: 'var(--primary)' }} />
          Realizado
        </span>
        <span>
          <i style={{ background: '#b7c3cf' }} />
          Planejado (LB) <span className="tb-mono">{formatPercent(planned)}</span>
        </span>
      </div>
    </div>
  );
}

export function Dashboard() {
  const analysis = useAnalysis();
  const navigate = useNavigate();
  if (!analysis) return null;
  const dash = computeDashboard(analysis);
  const { snapshot, derived } = analysis;
  const { profile, norms } = snapshot.governance;
  const policy = profile.procurementPolicy;
  const baseline = currentBaseline(snapshot);
  const worst = dash.perModule.filter((m) => m.rag === dash.overall && m.rag !== 'verde' && m.rag !== 'n/a');

  return (
    <div>
      <section className="card hero">
        <div>
          <div className="eyebrow">Situação geral</div>
          <div className="row" style={{ alignItems: 'center', marginTop: 4 }}>
            <h1 style={{ margin: 0 }}>Painel executivo</h1>
            <RagBadge rag={dash.overall} />
          </div>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {worst.length > 0
              ? worst.map((m) => `${m.label}: ${m.reason}`).join(' · ')
              : dash.overall === 'n/a'
                ? 'Sem dados suficientes para o RAG geral.'
                : 'Todos os módulos ativos dentro dos limites.'}
          </p>
          <div className="hero-meta">
            <span>
              Fase <strong>{profile.charter.currentPhase || '—'}</strong>
            </span>
            <span>
              Status <strong className="tb-mono">{formatDateBR(derived.statusDate)}</strong>
            </span>
            <span>
              LB <strong className="tb-mono">{baseline ? `v${baseline.version}` : 'não definida'}</strong>
            </span>
            <span>
              Término previsto{' '}
              <strong className="tb-mono">{formatDateBR(derived.schedule.ok ? derived.schedule.projectFinish : null)}</strong>
            </span>
          </div>
        </div>
        <ProgressRibbon actual={derived.progress.actual} planned={derived.progress.planned} />
      </section>

      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', marginBottom: 16 }}>
        {dash.perModule.map((m) => (
          <div key={m.id} className="health" aria-label={`RAG ${m.label}`}>
            <span className="status-dot" aria-hidden="true" style={{ background: `var(--${ragTone(m.rag)})` }} />
            <div style={{ minWidth: 0 }}>
              <div className="row" style={{ gap: 8 }}>
                <strong>{m.label}</strong>
                <RagBadge rag={m.rag} reason={m.reason} />
              </div>
              <div className="muted small" style={{ marginTop: 3 }}>
                {m.reason}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid" style={{ marginBottom: 16 }}>
        {dash.kpis.map((k) => (
          <KpiTile key={k.id} label={k.label} value={formatKpi(k)} />
        ))}
      </div>

      <div className="split">
        <Card title={`Alertas (${dash.alerts.length})`}>
          {dash.alerts.length === 0 ? (
            <div className="empty-state">
              <CheckCircle2 size={20} color="var(--green)" aria-hidden="true" />
              <p style={{ margin: '6px 0 0' }}>Nenhum alerta. Os desvios aparecem aqui assim que forem detectados.</p>
            </div>
          ) : (
            dash.alerts.map((a) => (
              <div className="alert-item" key={a.id}>
                {a.severity === 'vermelho' ? (
                  <AlertOctagon size={16} color="var(--red)" aria-label="Crítico" />
                ) : (
                  <AlertTriangle size={16} color="var(--gold)" aria-label="Atenção" />
                )}
                <span style={{ flex: 1 }}>{a.message}</span>
                {a.action?.kind === 'openChangeRequest' && (
                  <button className="btn btn-sm" onClick={() => navigate(NEW_CHANGE_REQUEST_PATH)}>
                    Abrir solicitação de mudança
                  </button>
                )}
                {a.action?.kind === 'openRecord' && (
                  <button
                    className="btn btn-sm"
                    onClick={() =>
                      a.action?.kind === 'openRecord' &&
                      navigate(RECORD_SECTIONS[`${a.action.module}.${a.action.collection}`] ?? '/projeto')
                    }
                  >
                    Abrir registro
                  </button>
                )}
              </div>
            ))
          )}
        </Card>

        <Card title="Definições do projeto">
          <dl className="def-list">
            <dt>Normas aplicáveis</dt>
            <dd>
              {Object.values(norms).length === 0 ? (
                <span className="muted">Nenhuma norma cadastrada.</span>
              ) : (
                <div className="row" style={{ gap: 6 }}>
                  {Object.values(norms).map((n) => (
                    <span key={n.id} className="code-chip" title={n.title}>
                      {n.standard}
                    </span>
                  ))}
                </div>
              )}
            </dd>
            <dt>Template de documentação</dt>
            <dd>{profile.documentTemplate.template ?? 'não definido'}</dd>
            <dt>Estratégia de aquisições</dt>
            <dd>
              Modalidade: {policy.model ?? 'não definida'}
              <br />
              Faturamento: {policy.billing ?? 'não definido'}
            </dd>
          </dl>
        </Card>
      </div>

      <BaselinePanel />
    </div>
  );
}
