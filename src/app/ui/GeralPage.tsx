import { Link, useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge, RagDot } from '@/shared/ui/Badge';
import { KpiTile } from '@/shared/ui/KpiTile';
import { computeDashboard } from '@/analytics/dashboard';
import { currentBaseline } from '@/analytics/derive';
import { BaselinePanel } from '@/modules/governance/ui/BaselinePanel';
import { useAnalysis } from '@/platform/react/hooks';
import { NEW_CHANGE_REQUEST_PATH, RECORD_SECTIONS } from '@/registers/module-view';
import { VIEWS } from '../registry';

const BAND_ORDER = ['Crítico', 'Alto', 'Moderado', 'Baixo', 'Não avaliado'] as const;
const BAND_TONE: Record<string, string> = { Crítico: 'red', Alto: 'amber', Moderado: 'blue', Baixo: 'green', 'Não avaliado': 'gray' };

const clampPct = (n: number | null) => Math.max(0, Math.min(100, n ?? 0));

/** Série da miniatura: pontos normalizados 0–1 no eixo y. */
type Series = { values: (number | null)[]; color: string; dashed?: boolean };

/** Miniatura da Curva S em SVG próprio (sem Recharts no carregamento inicial). */
function Sparkline({ series, max }: { series: Series[]; max: number }) {
  const w = 240;
  const h = 64;
  const n = Math.max(...series.map((s) => s.values.length));
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * w);
  const y = (v: number) => h - (max > 0 ? (v / max) * h : 0);
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h + 2}`} preserveAspectRatio="none" role="img" aria-label="Miniatura da Curva S" className="sparkline">
      <line x1={0} x2={w} y1={h} y2={h} stroke="var(--paper-line)" />
      {series.map((s, k) => {
        const points = s.values
          .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
          .filter((p): p is string => p !== null)
          .join(' ');
        return (
          <polyline key={k} points={points} fill="none" stroke={s.color} strokeWidth={1.8} strokeDasharray={s.dashed ? '4 3' : undefined} vectorEffect="non-scaling-stroke" />
        );
      })}
    </svg>
  );
}

/** "Geral": centro de comando executivo do projeto — consolida os 7 domínios (SPEC §6.1a). */
export function GeralPage() {
  const analysis = useAnalysis();
  const navigate = useNavigate();
  if (!analysis) return null;
  const dash = computeDashboard(analysis);
  const { snapshot, derived, config } = analysis;
  const { profile, norms } = snapshot.governance;
  const policy = profile.procurementPolicy;
  const baseline = currentBaseline(snapshot);
  const currency = config.settings.finances.baseCurrency;
  const fin = derived.finances;
  const penalty = derived.penalty;
  const worst = dash.perModule.filter((m) => m.rag === dash.overall && m.rag !== 'verde' && m.rag !== 'n/a');
  const money = (v: number | null | undefined) => (v === null || v === undefined ? 'n/a' : formatMoneyBR(Math.round(v), currency));
  const sectionPath = (id: keyof typeof VIEWS) => `/projeto/${id}/${VIEWS[id].sections[0]?.path ?? ''}`;

  // Sem Finanças, o SPI exibido é o físico (Cronograma).
  const spi = fin ? fin.evm.spi : derived.progress.spi;
  const evmTiles: [string, string, string][] = [
    ['BAC', money(fin?.evm.bac), 'Orçamento no término'],
    ['PV', money(fin?.evm.pv), 'Planejado na data de status'],
    ['EV', money(fin?.evm.ev), 'Valor agregado'],
    ['AC', money(fin?.evm.ac), 'Custo real'],
    ['CPI', formatRatio(fin?.evm.cpi), 'EV ÷ AC'],
    ['SPI', formatRatio(spi), fin ? 'EV ÷ PV' : 'físico (Custos & Finanças desligado)'],
    ['EAC', money(fin?.evm.eac), 'BAC ÷ CPI'],
  ];

  const total = fin?.summary.total;
  const trioMax = total ? Math.max(total.budgeted, total.committed, total.actual, 1) : 1;
  const curve = fin && fin.moneySCurve.length > 0 ? fin.moneySCurve : null;
  const sparkline = curve ? (
    <Sparkline
      max={Math.max(...curve.map((p) => Math.max(p.pv, p.ev ?? 0, p.ac ?? 0)))}
      series={[
        { values: curve.map((p) => p.pv), color: 'var(--chart-planned)', dashed: true },
        { values: curve.map((p) => p.ev), color: 'var(--navy)' },
        { values: curve.map((p) => p.ac), color: 'var(--red)' },
      ]}
    />
  ) : derived.sCurve.length > 0 ? (
    <Sparkline
      max={100}
      series={[
        { values: derived.sCurve.map((p) => p.planned), color: 'var(--chart-planned)', dashed: true },
        { values: derived.sCurve.map((p) => p.actual), color: 'var(--navy)' },
      ]}
    />
  ) : (
    <p className="muted small">Defina a linha de base para ver a Curva S.</p>
  );

  return (
    <div>
      <section className="card tb-card hero">
        <div>
          <div className="eyebrow">Geral · situação do projeto</div>
          <div className="row" style={{ alignItems: 'center', marginTop: 4 }}>
            <h1 style={{ margin: 0 }}>Painel executivo</h1>
            <RagDot rag={dash.overall} />
          </div>
          <p className="muted" style={{ margin: '6px 0 0' }}>
            {worst.length > 0
              ? worst.map((m) => `${m.label}: ${m.reason}`).join(' · ')
              : dash.overall === 'n/a'
                ? 'Sem dados suficientes para a situação geral.'
                : 'Todos os domínios ativos dentro dos limites.'}
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
      </section>

      {/* a) Semáforo dos 7 domínios: cada card leva ao domínio. */}
      <ul className="rag-grid" aria-label="Semáforo dos domínios">
        {dash.perModule.map((m) => (
          <li key={m.id}>
            <Link to={sectionPath(m.id)} className="health health-link">
              <RagDot rag={m.rag} reason={m.reason} />
              <div style={{ minWidth: 0 }}>
                <strong>{m.label}</strong>
                <div className="muted small" style={{ marginTop: 3 }}>
                  {m.reason}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* b) Valor agregado e prazo. */}
      <section className="card tb-card" aria-label="Valor agregado e prazo">
        <div className="card-head">
          <h2>Valor agregado e prazo</h2>
          {!fin && <span className="muted small">Custos & Finanças desligado — valores monetários n/a.</span>}
        </div>
        <div className="grid evm-grid">
          {evmTiles.map(([label, value, hint]) => (
            <KpiTile key={label} label={label} value={value} hint={hint} />
          ))}
          <KpiTile label="Avanço físico" value={formatPercent(derived.progress.actual)} hint={`planejado (LB) ${formatPercent(derived.progress.planned)}`}>
            <div className="meter" style={{ marginTop: 6 }} aria-hidden="true">
              <span className="planned" style={{ width: `${clampPct(derived.progress.planned)}%` }} />
              <span className="actual" style={{ width: `${clampPct(derived.progress.actual)}%` }} />
            </div>
          </KpiTile>
        </div>
      </section>

      {/* Provisão de multa contratual por atraso (Governança × Cronograma × LB). */}
      <section className="card tb-card" aria-label="Multa contratual por atraso">
        <div className="card-head">
          <h2>Multa contratual por atraso</h2>
          <Link to="/projeto/governance/contrato" className="small">
            {penalty ? 'Ver cláusula' : 'Configurar cláusula'}
          </Link>
        </div>
        {penalty ? (
          <div className="penalty-row">
            <div>
              <div className="eyebrow">Provisão (atraso real ou previsto)</div>
              <div className="tb-mono penalty-value">{penalty.totalCents === null ? 'n/a' : formatMoneyBR(penalty.totalCents, currency)}</div>
              {penalty.capped && <Badge text="Teto atingido" tone="red" />}
            </div>
            <div className="small" style={{ flex: 1, minWidth: 0 }}>
              {penalty.reason ??
                (penalty.items.length === 0 ? (
                  <span className="muted">Nenhum marco contratual atrasado.</span>
                ) : (
                  <ul className="plain-list">
                    {penalty.items.map((i) => (
                      <li key={i.milestoneId}>
                        <span className="tb-mono">
                          {i.code} · {i.delayDays} dia(s)
                        </span>{' '}
                        <span className="muted">{i.name}</span>
                      </li>
                    ))}
                  </ul>
                ))}
              <div className="muted" style={{ marginTop: 4 }}>
                {penalty.clauseText}
              </div>
            </div>
          </div>
        ) : (
          <p className="muted small" style={{ margin: 0 }}>
            {profile.latePenalty.enabled ? 'Cronograma desligado.' : 'Cláusula de multa não configurada.'}
          </p>
        )}
      </section>

      <div className="split" style={{ marginBottom: 16 }}>
        {/* c) Quadro financeiro + miniatura da Curva S. */}
        <section className="card tb-card" aria-label="Orçado × comprometido × realizado" style={{ marginBottom: 0 }}>
          <div className="card-head">
            <h2>Orçado × comprometido × realizado</h2>
          </div>
          {total ? (
            (
              [
                ['Orçado', total.budgeted, 'var(--chart-baseline)'],
                ['Comprometido', total.committed, 'var(--amber)'],
                ['Realizado', total.actual, 'var(--navy)'],
              ] as const
            ).map(([label, value, color]) => (
              <div key={label} className="money-bar">
                <span className="small">{label}</span>
                <span className="meter" aria-hidden="true">
                  <span style={{ width: `${(value / trioMax) * 100}%`, background: color }} />
                </span>
                <span className="tb-mono small">{formatMoneyBR(value, currency)}</span>
              </div>
            ))
          ) : (
            <p className="muted small">Custos & Finanças desligado.</p>
          )}
          <div className="sparkline-box">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="eyebrow">Curva S</span>
              <Link to="/projeto/schedule/curva-s" className="small">
                Abrir Curva S
              </Link>
            </div>
            {sparkline}
          </div>
        </section>

        {/* d) Riscos por faixa e exposição financeira × contingência. */}
        {derived.risks && (
          <section className="card tb-card" aria-label="Riscos por faixa" style={{ marginBottom: 0 }}>
            <div className="card-head">
              <h2>Riscos por faixa</h2>
              <Link to="/projeto/risks/matriz" className="small">
                Abrir matriz de riscos
              </Link>
            </div>
            <ul className="band-list">
              {BAND_ORDER.map((b) => (
                <li key={b}>
                  <span className="tb-badge" style={{ color: `var(--${BAND_TONE[b]})`, background: `var(--${BAND_TONE[b]}-soft)` }}>
                    {b}
                  </span>
                  <span className="tb-mono">{derived.risks!.byBand[b]}</span>
                </li>
              ))}
            </ul>
            {fin && (
              <>
                <dl className="def-list" style={{ marginTop: 14 }}>
                  <dt>Valor esperado dos riscos abertos</dt>
                  <dd className="tb-mono">{formatMoneyBR(fin.contingency.openRiskEmv, currency)}</dd>
                  <dt>Saldo de contingência</dt>
                  <dd className="tb-mono">{formatMoneyBR(fin.contingency.balance, currency)}</dd>
                </dl>
                <div style={{ marginTop: 8 }}>
                  <Badge
                    text={fin.contingency.coversRisks ? 'Cobre os riscos abertos' : 'Não cobre os riscos abertos'}
                    tone={fin.contingency.coversRisks ? 'green' : 'red'}
                  />
                </div>
              </>
            )}
          </section>
        )}
      </div>

      <div className="split">
        {/* e) Alertas cruzados com atalhos. */}
        <section className="card tb-card" aria-label={`Alertas (${dash.alerts.length})`}>
          <div className="card-head">
            <h2>{`Alertas (${dash.alerts.length})`}</h2>
          </div>
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
        </section>

        <section className="card tb-card" aria-label="Definições do projeto">
          <div className="card-head">
            <h2>Definições do projeto</h2>
          </div>
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
        </section>
      </div>

      <BaselinePanel />
    </div>
  );
}
