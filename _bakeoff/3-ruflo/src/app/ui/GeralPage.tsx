import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertOctagon, AlertTriangle } from 'lucide-react';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio, hasValue } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge, RagDot } from '@/shared/ui/Badge';
import { KpiTile } from '@/shared/ui/KpiTile';
import { computeDashboard } from '@/analytics/dashboard';
import { currentBaseline } from '@/analytics/derive';
import {
  EVM_ADVANCED,
  EVM_ADVANCED_TOGGLE,
  EVM_ESSENTIAL,
  type EvmIndicatorDef,
} from '@/modules/finances';
import { BaselinePanel } from '@/modules/governance/ui/BaselinePanel';
import { useAnalysis } from '@/platform/react/hooks';
import { NEW_CHANGE_REQUEST_PATH, RECORD_SECTIONS } from '@/registers/module-view';
import { VIEWS } from '../registry';
import { FillGuide } from './FillGuide';

const BAND_ORDER = ['Crítico', 'Alto', 'Moderado', 'Baixo', 'Não avaliado'] as const;
const BAND_TONE: Record<string, string> = {
  Crítico: 'red',
  Alto: 'amber',
  Moderado: 'blue',
  Baixo: 'green',
  'Não avaliado': 'gray',
};

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
    <svg
      width="100%"
      viewBox={`0 0 ${w} ${h + 2}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Miniatura da Curva S"
      className="sparkline"
    >
      <line x1={0} x2={w} y1={h} y2={h} stroke="var(--paper-line)" />
      {series.map((s, k) => {
        const points = s.values
          .map((v, i) => (v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`))
          .filter((p): p is string => p !== null)
          .join(' ');
        return (
          <polyline
            key={k}
            points={points}
            fill="none"
            stroke={s.color}
            strokeWidth={1.8}
            strokeDasharray={s.dashed ? '4 3' : undefined}
            vectorEffect="non-scaling-stroke"
          />
        );
      })}
    </svg>
  );
}

/** "Geral": centro de comando executivo do projeto — consolida os 7 domínios (SPEC §6.1a). */
export function GeralPage() {
  const analysis = useAnalysis();
  const navigate = useNavigate();
  const [advanced, setAdvanced] = useState(false);
  if (!analysis) return null;
  const dash = computeDashboard(analysis);
  const { snapshot, derived, config } = analysis;
  const { profile, norms } = snapshot.governance;
  const policy = profile.procurementPolicy;
  const baseline = currentBaseline(snapshot);
  const currency = config.settings.finances.baseCurrency;
  const fin = derived.finances;
  const penalty = derived.penalty;
  const worst = dash.perModule.filter(
    (m) => m.rag === dash.overall && m.rag !== 'verde' && m.rag !== 'n/a',
  );
  const money = (v: number) => formatMoneyBR(Math.round(v), currency);
  const sectionPath = (id: keyof typeof VIEWS) =>
    `/projeto/${id}/${VIEWS[id].sections[0]?.path ?? ''}`;
  const partyName = (id: string | null) =>
    id
      ? snapshot.stakeholders.parties[id as keyof typeof snapshot.stakeholders.parties]?.name
      : null;
  const { charter } = profile;

  // Campos nulos (sem dado no domínio) ficam fora do DOM: nada de "n/a", "—" ou rótulo vazio.
  const meta = (
    [
      ['Fase', charter.currentPhase, false],
      ['Status', formatDateBR(derived.statusDate), true],
      ['LB', baseline ? `v${baseline.version}` : null, true],
      [
        'Término previsto',
        derived.schedule.ok && derived.schedule.projectFinish
          ? formatDateBR(derived.schedule.projectFinish)
          : null,
        true,
      ],
      ['Cliente', partyName(charter.clientId), false],
      ['Gerente', partyName(charter.managerId), false],
      ['Patrocinador', partyName(charter.sponsorId), false],
      [
        'Valor do contrato',
        profile.latePenalty.contractValueCents === null
          ? null
          : money(profile.latePenalty.contractValueCents),
        true,
      ],
      ['Aprovação', charter.approvalDate ? formatDateBR(charter.approvalDate) : null, true],
    ] as [string, string | null | undefined, boolean][]
  ).filter(([, v]) => hasValue(v));

  // Valores monetários só com itens de custo/receita lançados; sem Finanças, o SPI é o físico (Cronograma).
  const costs = fin && fin.items.length > 0 ? fin : null;
  const physicalSpi = (d: EvmIndicatorDef) => d.key === 'spi' && !fin;
  const tiles = (defs: EvmIndicatorDef[]) =>
    defs.flatMap((d) => {
      const v = physicalSpi(d) ? derived.progress.spi : costs?.evm[d.key];
      if (typeof v !== 'number' || !hasValue(v)) return [];
      const hint = physicalSpi(d)
        ? 'Avanço físico real ÷ planejado pela Linha de Base (meta ≥ 1,00)'
        : d.hint;
      return [
        <KpiTile
          key={d.key}
          label={d.label}
          value={d.format === 'ratio' ? formatRatio(v) : money(v)}
          hint={hint}
        />,
      ];
    });
  const evmTiles = tiles(EVM_ESSENTIAL);
  const advancedTiles = tiles(EVM_ADVANCED);
  const physical = hasValue(derived.progress.actual);

  const total = costs?.summary.total;
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
        {
          values: derived.sCurve.map((p) => p.planned),
          color: 'var(--chart-planned)',
          dashed: true,
        },
        { values: derived.sCurve.map((p) => p.actual), color: 'var(--navy)' },
      ]}
    />
  ) : null;
  const curveLink = (
    <Link to="/projeto/schedule/curva-s" className="small">
      Abrir Curva S
    </Link>
  );

  const hasRisks = !!derived.risks && Object.keys(snapshot.risks.risks).length > 0;
  const normList = Object.values(norms);
  const definitions =
    normList.length > 0 ||
    hasValue(profile.documentTemplate.template) ||
    hasValue(policy.model) ||
    hasValue(policy.billing);

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
          <ul className="hero-meta" aria-label="Dados do projeto">
            {meta.map(([label, value, mono]) => (
              <li key={label}>
                <span>{label}</span>{' '}
                <strong className={mono ? 'tb-mono' : undefined}>{value}</strong>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <FillGuide snapshot={snapshot} enabled={config.enabled} />

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

      {/* b) Valor agregado e prazo: só os indicadores com valor calculado. */}
      {(evmTiles.length > 0 || physical) && (
        <section className="card tb-card" aria-label="Valor agregado e prazo">
          <div className="card-head">
            <h2>Valor agregado e prazo</h2>
            {advancedTiles.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-ghost"
                aria-pressed={advanced}
                onClick={() => setAdvanced(!advanced)}
              >
                {EVM_ADVANCED_TOGGLE}
              </button>
            )}
          </div>
          <div className="grid evm-grid">
            {evmTiles}
            {physical && (
              <KpiTile
                label="Avanço físico"
                value={formatPercent(derived.progress.actual)}
                hint={
                  hasValue(derived.progress.planned)
                    ? `planejado (LB) ${formatPercent(derived.progress.planned)}`
                    : undefined
                }
              >
                <div className="meter" style={{ marginTop: 6 }} aria-hidden="true">
                  <span
                    className="planned"
                    style={{ width: `${clampPct(derived.progress.planned)}%` }}
                  />
                  <span
                    className="actual"
                    style={{ width: `${clampPct(derived.progress.actual)}%` }}
                  />
                </div>
              </KpiTile>
            )}
          </div>
          {advanced && advancedTiles.length > 0 && (
            <div aria-label="Projeções avançadas" role="region" style={{ marginTop: 12 }}>
              <div className="eyebrow" style={{ marginBottom: 6 }}>
                Projeções avançadas
              </div>
              <div className="grid evm-grid">{advancedTiles}</div>
            </div>
          )}
        </section>
      )}

      {/* Provisão de multa contratual por atraso (Governança × Cronograma × LB); só com cláusula e valor calculado. */}
      {penalty && penalty.totalCents !== null && (
        <section className="card tb-card" aria-label="Multa contratual por atraso">
          <div className="card-head">
            <h2>Multa contratual por atraso</h2>
            <Link to="/projeto/governance/contrato" className="small">
              Ver cláusula
            </Link>
          </div>
          <div className="penalty-row">
            <div>
              <div className="eyebrow">Provisão (atraso real ou previsto)</div>
              <div className="tb-mono penalty-value">
                {formatMoneyBR(penalty.totalCents, currency)}
              </div>
              {penalty.capped && <Badge text="Teto atingido" tone="red" />}
            </div>
            <div className="small" style={{ flex: 1, minWidth: 0 }}>
              {penalty.items.length === 0 ? (
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
              )}
              {hasValue(penalty.clauseText) && (
                <div className="muted" style={{ marginTop: 4 }}>
                  {penalty.clauseText}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {(total || sparkline || hasRisks) && (
        <div className="split" style={{ marginBottom: 16 }}>
          {/* c) Quadro financeiro + miniatura da Curva S (só com custos lançados). */}
          {total ? (
            <section
              className="card tb-card"
              aria-label="Orçado × comprometido × realizado"
              style={{ marginBottom: 0 }}
            >
              <div className="card-head">
                <h2>Orçado × comprometido × realizado</h2>
              </div>
              {(
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
              ))}
              {sparkline && (
                <div className="sparkline-box">
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <span className="eyebrow">Curva S</span>
                    {curveLink}
                  </div>
                  {sparkline}
                </div>
              )}
            </section>
          ) : (
            sparkline && (
              <section className="card tb-card" aria-label="Curva S" style={{ marginBottom: 0 }}>
                <div className="card-head">
                  <h2>Curva S</h2>
                  {curveLink}
                </div>
                {sparkline}
              </section>
            )
          )}

          {/* d) Riscos por faixa e exposição financeira × contingência (só com riscos registrados). */}
          {hasRisks && derived.risks && (
            <section
              className="card tb-card"
              aria-label="Riscos por faixa"
              style={{ marginBottom: 0 }}
            >
              <div className="card-head">
                <h2>Riscos por faixa</h2>
                <Link to="/projeto/risks/matriz" className="small">
                  Abrir matriz de riscos
                </Link>
              </div>
              <ul className="band-list">
                {BAND_ORDER.map((b) => (
                  <li key={b}>
                    <span
                      className="tb-badge"
                      style={{
                        color: `var(--${BAND_TONE[b]})`,
                        background: `var(--${BAND_TONE[b]}-soft)`,
                      }}
                    >
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
                    <dd className="tb-mono">
                      {formatMoneyBR(fin.contingency.openRiskEmv, currency)}
                    </dd>
                    <dt>Saldo de contingência</dt>
                    <dd className="tb-mono">{formatMoneyBR(fin.contingency.balance, currency)}</dd>
                  </dl>
                  <div style={{ marginTop: 8 }}>
                    <Badge
                      text={
                        fin.contingency.coversRisks
                          ? 'Cobre os riscos abertos'
                          : 'Não cobre os riscos abertos'
                      }
                      tone={fin.contingency.coversRisks ? 'green' : 'red'}
                    />
                  </div>
                </>
              )}
            </section>
          )}
        </div>
      )}

      {(dash.alerts.length > 0 || definitions) && (
        <div className="split">
          {/* e) Alertas cruzados com atalhos (só quando há alertas). */}
          {dash.alerts.length > 0 && (
            <section className="card tb-card" aria-label={`Alertas (${dash.alerts.length})`}>
              <div className="card-head">
                <h2>{`Alertas (${dash.alerts.length})`}</h2>
              </div>
              {dash.alerts.map((a) => (
                <div className="alert-item" key={a.id}>
                  {a.severity === 'vermelho' ? (
                    <AlertOctagon size={16} color="var(--red)" aria-label="Crítico" />
                  ) : (
                    <AlertTriangle size={16} color="var(--gold)" aria-label="Atenção" />
                  )}
                  <span style={{ flex: 1 }}>{a.message}</span>
                  {a.action?.kind === 'openChangeRequest' && (
                    <button
                      className="btn btn-sm"
                      onClick={() => navigate(NEW_CHANGE_REQUEST_PATH)}
                    >
                      Abrir solicitação de mudança
                    </button>
                  )}
                  {a.action?.kind === 'openRecord' && (
                    <button
                      className="btn btn-sm"
                      onClick={() =>
                        a.action?.kind === 'openRecord' &&
                        navigate(
                          RECORD_SECTIONS[`${a.action.module}.${a.action.collection}`] ??
                            '/projeto',
                        )
                      }
                    >
                      Abrir registro
                    </button>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* f) Definições: só os campos preenchidos na Governança. */}
          {definitions && (
            <section className="card tb-card" aria-label="Definições do projeto">
              <div className="card-head">
                <h2>Definições do projeto</h2>
              </div>
              <dl className="def-list">
                {normList.length > 0 && (
                  <>
                    <dt>Normas aplicáveis</dt>
                    <dd>
                      <div className="row" style={{ gap: 6 }}>
                        {normList.map((n) => (
                          <span key={n.id} className="code-chip" title={n.title}>
                            {n.standard}
                          </span>
                        ))}
                      </div>
                    </dd>
                  </>
                )}
                {hasValue(profile.documentTemplate.template) && (
                  <>
                    <dt>Template de documentação</dt>
                    <dd>{profile.documentTemplate.template}</dd>
                  </>
                )}
                {(hasValue(policy.model) || hasValue(policy.billing)) && (
                  <>
                    <dt>Estratégia de aquisições</dt>
                    <dd>
                      {hasValue(policy.model) && <div>Modalidade: {policy.model}</div>}
                      {hasValue(policy.billing) && <div>Faturamento: {policy.billing}</div>}
                    </dd>
                  </>
                )}
              </dl>
            </section>
          )}
        </div>
      )}

      <BaselinePanel />
    </div>
  );
}
