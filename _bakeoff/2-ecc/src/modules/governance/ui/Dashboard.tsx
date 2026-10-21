import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CircleAlert, CircleCheck } from 'lucide-react';
import type { Alert, Indicator } from '@/core/indicators';
import { formatDateBR } from '@/shared/lib/dates';
import { formatCount, formatPercent, formatRatio } from '@/shared/lib/format';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { KpiTile } from '@/shared/ui/KpiTile';
import { ragLabel, ragTone } from '@/shared/ui/tones';
import { computeDashboard } from '@/analytics/dashboard';
import { useAnalysis } from '@/platform/react/hooks';
import { BaselinePanel } from './BaselinePanel';

function formatKpi(k: Indicator): string {
  if (k.format === 'ratio') return formatRatio(k.value);
  if (k.format === 'percent') return formatPercent(k.value);
  if (k.format === 'days') return k.value === null ? 'n/a' : `${k.value} d`;
  return formatCount(k.value);
}

const SECTION_OF: Record<string, string> = { changeRequests: 'mudancas', deliverables: 'entregaveis', milestones: 'marcos' };

function AlertAction({ alert }: { alert: Alert }) {
  if (!alert.action) return null;
  const label = alert.action.kind === 'openChangeRequest' ? 'Abrir solicitação de mudança' : 'Abrir registro';
  const to =
    alert.action.kind === 'openChangeRequest'
      ? '/projeto/scope/mudancas?nova=1'
      : `/projeto/${alert.action.module}/${SECTION_OF[alert.action.collection] ?? ''}`;
  return (
    <Link to={to} className="tb-row" style={{ gap: 4, fontSize: 13, fontWeight: 500 }}>
      {label} <ArrowRight size={13} aria-hidden="true" />
    </Link>
  );
}

/** Painel executivo: RAG (sempre com texto e motivo), KPIs, alertas derivados e definições. */
export function Dashboard() {
  const ctx = useAnalysis();
  if (!ctx) return null;
  const d = computeDashboard(ctx);
  const { profile, norms } = ctx.snapshot.governance;
  const policy = profile.procurementPolicy;
  const tone = ragTone(d.overall);
  const critical = d.alerts.filter((a) => a.severity === 'vermelho').length;

  return (
    <div>
      <div className="tb-dash-top">
        <Card title="Status geral">
          <div className="tb-rag-hero">
            <div
              data-testid="rag-overall"
              className="tb-rag-big"
              style={{ color: `var(--${tone})`, ['--rag' as string]: `var(--${tone})`, ['--rag-soft' as string]: `var(--${tone}-soft)` }}
            >
              <span className="tb-rag-light" aria-hidden="true" />
              {ragLabel(d.overall)}
            </div>
            <p className="tb-hint">Pior status entre os módulos ativos (n/a não conta).</p>
            <p className="tb-hint">
              Data de status <span className="tb-mono" style={{ color: 'var(--ink)' }}>{formatDateBR(ctx.derived.statusDate)}</span>
            </p>
          </div>
        </Card>
        <Card title="Por módulo">
          <ul className="tb-module-list">
            {d.perModule.map((m) => (
              <li key={m.id} data-testid={`rag-${m.id}`}>
                <strong style={{ fontWeight: 600 }}>{m.label}</strong>
                <Badge text={ragLabel(m.rag)} tone={ragTone(m.rag)} dot />
                <span className="tb-hint" style={{ margin: 0 }}>
                  {m.reason}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="tb-grid" style={{ marginBottom: 16 }}>
        {d.kpis.map((k) => (
          <KpiTile key={k.id} label={k.label} value={formatKpi(k)} />
        ))}
      </div>

      <Card
        title={
          <>
            Alertas <Badge text={String(d.alerts.length)} tone={critical ? 'red' : d.alerts.length ? 'gold' : 'gray'} />
          </>
        }
      >
        {!d.alerts.length && (
          <p className="tb-row tb-hint" style={{ gap: 6 }}>
            <CircleCheck size={15} color="var(--green)" aria-hidden="true" /> Nenhum alerta.
          </p>
        )}
        <ul className="tb-alerts">
          {d.alerts.map((a) => {
            const red = a.severity === 'vermelho';
            const Icon = red ? CircleAlert : AlertTriangle;
            return (
              <li key={a.id}>
                <Icon size={16} color={red ? 'var(--red)' : 'var(--gold)'} aria-hidden="true" />
                <div className="tb-alert-body">
                  <Badge text={red ? 'Crítico' : 'Atenção'} tone={red ? 'red' : 'gold'} />
                  <span>{a.message}</span>
                  <AlertAction alert={a} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>

      <BaselinePanel />

      <Card title="Definições do projeto">
        <dl data-testid="definitions" className="tb-defs">
          <dt>Normas aplicáveis</dt>
          <dd>
            {Object.values(norms).length ? Object.values(norms).map((n) => n.standard).join(', ') : 'nenhuma cadastrada'}
          </dd>
          <dt>Template de documentação</dt>
          <dd>{profile.documentTemplate.template ?? 'não definido'}</dd>
          <dt>Estratégia de aquisições</dt>
          <dd>
            {policy.model ?? 'modalidade não definida'} · {policy.billing ?? 'faturamento não definido'}
          </dd>
        </dl>
      </Card>
    </div>
  );
}
