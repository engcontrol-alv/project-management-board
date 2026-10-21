import type { ReactNode } from 'react';
import type { AnalysisContext } from '@/analytics/alerts/types';
import type { Dashboard } from '@/analytics/dashboard';
import type { MoneyPoint } from '@/analytics/finances';
import { supplierPanel } from '@/analytics/supplier-panel';
import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent, formatRatio } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge, RagDot, StatusBadge } from '@/shared/ui/Badge';
import { KpiTile } from '@/shared/ui/KpiTile';
import { isPendingCr } from '@/modules/governance';
import { BANDS, exposure, isOpen, levelLabels, levelsFor, type Band } from '@/modules/risks';
import { communicationStatus, type Organization } from '@/modules/stakeholders';
import { TestsCell } from '@/modules/scope/ui/DeliverablesPage';
import type { ReportSectionId } from './report-config';

type Ctx = AnalysisContext & { dash: Dashboard };

const BAND_TONE: Record<Band, string> = { Crítico: 'red', Alto: 'amber', Moderado: 'blue', Baixo: 'green' };
const byCode = (a: { code: string }, b: { code: string }) => a.code.localeCompare(b.code, 'pt-BR', { numeric: true });

function Table({ label, head, rows, empty }: { label: string; head: string[]; rows: ReactNode[][]; empty: string }) {
  if (rows.length === 0) return <p className="muted small">{empty}</p>;
  return (
    <table className="tbl report-tbl" aria-label={label}>
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const Sub = ({ children }: { children: ReactNode }) => <h3 className="report-sub">{children}</h3>;

function partyName(c: Ctx, id: string | null): string {
  if (!id) return '—';
  return c.snapshot.stakeholders.parties[id as keyof typeof c.snapshot.stakeholders.parties]?.name ?? '—';
}

const money = (c: Ctx) => (v: number | null | undefined) =>
  v === null || v === undefined ? 'n/a' : formatMoneyBR(Math.round(v), c.config.settings.finances.baseCurrency);

/** Curva S monetária em SVG próprio: vetorial, sem medir o contêiner nem animar (sai inteira no PDF). */
function SCurveSvg({ points }: { points: MoneyPoint[] }) {
  const w = 640;
  const h = 200;
  const pad = 4;
  const max = Math.max(1, ...points.map((p) => Math.max(p.pv, p.ev ?? 0, p.ac ?? 0)));
  const x = (i: number) => pad + (points.length <= 1 ? 0 : (i / (points.length - 1)) * (w - 2 * pad));
  const y = (v: number) => h - pad - (v / max) * (h - 2 * pad);
  const line = (pick: (p: MoneyPoint) => number | null) =>
    points
      .map((p, i) => {
        const v = pick(p);
        return v === null ? null : `${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      })
      .filter((s): s is string => s !== null)
      .join(' ');
  const series = [
    { name: 'PV (planejado)', color: 'var(--chart-planned)', dash: '5 4', pts: line((p) => p.pv) },
    { name: 'EV (agregado)', color: 'var(--navy)', dash: undefined, pts: line((p) => p.ev) },
    { name: 'AC (real)', color: 'var(--red)', dash: undefined, pts: line((p) => p.ac) },
  ];
  return (
    <figure className="report-figure">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" role="img" aria-label="Curva S — PV × EV × AC" className="report-scurve">
        <line x1={pad} x2={w - pad} y1={h - pad} y2={h - pad} stroke="var(--line-strong)" />
        {series.map((s) => (
          <polyline key={s.name} points={s.pts} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash} />
        ))}
      </svg>
      <figcaption className="report-legend small">
        {series.map((s) => (
          <span key={s.name}>
            <span className="legend-swatch" style={{ background: s.color }} aria-hidden="true" /> {s.name}
          </span>
        ))}
        <span className="muted">
          {formatDateBR(points[0]!.date)} a {formatDateBR(points[points.length - 1]!.date)}
        </span>
      </figcaption>
    </figure>
  );
}

function Overview(c: Ctx) {
  const { dash, derived, snapshot } = c;
  const worst = dash.perModule.filter((m) => m.rag === dash.overall && m.rag !== 'verde' && m.rag !== 'n/a');
  return (
    <>
      <p className="report-lead">
        <RagDot rag={dash.overall} />{' '}
        {worst.length > 0
          ? worst.map((m) => `${m.label}: ${m.reason}`).join(' · ')
          : dash.overall === 'n/a'
            ? 'Sem dados suficientes para a situação geral.'
            : 'Todos os domínios ativos dentro dos limites.'}
      </p>
      <dl className="def-list report-facts">
        <dt>Fase atual</dt>
        <dd>{snapshot.governance.profile.charter.currentPhase || '—'}</dd>
        <dt>Término previsto</dt>
        <dd className="tb-mono">{formatDateBR(derived.schedule.ok ? derived.schedule.projectFinish : null)}</dd>
        <dt>Avanço físico (real × planejado)</dt>
        <dd className="tb-mono">
          {formatPercent(derived.progress.actual)} × {formatPercent(derived.progress.planned)}
        </dd>
      </dl>
      <Sub>Saúde dos domínios</Sub>
      <ul className="report-domains" aria-label="Saúde dos domínios">
        {dash.perModule.map((m) => (
          <li key={m.id}>
            <RagDot rag={m.rag} reason={m.reason} /> <strong>{m.label}</strong> <span className="muted">{m.reason}</span>
          </li>
        ))}
      </ul>
      <Sub>{`Alertas ativos (${dash.alerts.length})`}</Sub>
      {dash.alerts.length === 0 ? (
        <p className="muted small">Nenhum alerta ativo.</p>
      ) : (
        <ul className="report-alerts" aria-label="Alertas ativos">
          {dash.alerts.map((a) => (
            <li key={a.id}>
              <RagDot rag={a.severity} /> {a.message}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function Governance(c: Ctx) {
  const { snapshot, derived, config } = c;
  const { charter, procurementPolicy } = snapshot.governance.profile;
  const phases = config.settings.schedule.phases;
  const current = phases.indexOf(charter.currentPhase);
  const crs = Object.values(snapshot.governance.changeRequests).sort(byCode);
  const m = money(c);
  return (
    <>
      <Sub>Identidade do contrato</Sub>
      <dl className="def-list report-facts">
        <dt>Cliente</dt>
        <dd>{partyName(c, charter.clientId)}</dd>
        <dt>Patrocinador</dt>
        <dd>{partyName(c, charter.sponsorId)}</dd>
        <dt>Gerente do projeto</dt>
        <dd>{partyName(c, charter.managerId)}</dd>
        <dt>Situação</dt>
        <dd>{charter.status}</dd>
        <dt>Objetivo</dt>
        <dd>{charter.objective || '—'}</dd>
        <dt>Modalidade / faturamento</dt>
        <dd>
          {procurementPolicy.model ?? 'não definida'} · {procurementPolicy.billing ?? 'não definido'}
        </dd>
      </dl>
      <Sub>Fases do ciclo de vida</Sub>
      <Table
        label="Fases do ciclo de vida"
        head={['#', 'Fase', 'Situação']}
        empty="Nenhuma fase configurada."
        rows={phases.map((p, i) => [
          String(i + 1),
          p,
          <StatusBadge key="s" status={current < 0 ? 'Prevista' : i < current ? 'Concluída' : i === current ? 'Atual' : 'Prevista'} />,
        ])}
      />
      <Sub>Cláusula de multa por atraso</Sub>
      {derived.penalty ? (
        <p className="small">
          {derived.penalty.clauseText} — provisão <strong className="tb-mono">{m(derived.penalty.totalCents)}</strong>
          {derived.penalty.capped && <> <Badge text="Teto atingido" tone="red" /></>}
        </p>
      ) : (
        <p className="muted small">Cláusula de multa não configurada.</p>
      )}
      <Sub>{`Solicitações de mudança (${crs.filter((x) => isPendingCr(x.status)).length} pendente(s))`}</Sub>
      <Table
        label="Solicitações de mudança"
        head={['Código', 'Título', 'Status', 'Prazo (dias)', 'Custo']}
        empty="Nenhuma solicitação de mudança."
        rows={crs.map((x) => [
          <span key="c" className="tb-mono">{x.code}</span>,
          x.title,
          <StatusBadge key="s" status={x.status} />,
          <span key="d" className="tb-mono">{x.scheduleImpactDays ?? '—'}</span>,
          <span key="m" className="tb-mono">{x.costImpactCents === null ? '—' : m(x.costImpactCents)}</span>,
        ])}
      />
    </>
  );
}

function Scope(c: Ctx) {
  const { snapshot, derived } = c;
  const tasks = derived.schedule.ok ? derived.schedule.tasks : null;
  const packages = Object.values(snapshot.scope.wbs).filter((n) => n.kind === 'Pacote de trabalho').sort(byCode);
  const deliverables = Object.values(snapshot.scope.deliverables).sort(byCode);
  return (
    <>
      <Sub>Pacotes de trabalho (EAP)</Sub>
      <Table
        label="Pacotes de trabalho"
        head={['EAP', 'Pacote', 'Início', 'Término', '% físico']}
        empty="Nenhum pacote de trabalho."
        rows={packages.map((p) => [
          <span key="c" className="tb-mono">{p.code}</span>,
          <>
            {p.name} {tasks?.[p.id]?.critical && <Badge text="Crítico" tone="red" />}
          </>,
          <span key="s" className="tb-mono">{formatDateBR(tasks?.[p.id]?.start ?? null)}</span>,
          <span key="f" className="tb-mono">{formatDateBR(tasks?.[p.id]?.finish ?? null)}</span>,
          <span key="p" className="tb-mono">{formatPercent(p.percentComplete)}</span>,
        ])}
      />
      <Sub>Entregáveis</Sub>
      <Table
        label="Entregáveis"
        head={['Código', 'Entregável', 'Status', 'TAF / TAC']}
        empty="Nenhum entregável."
        rows={deliverables.map((d) => [
          <span key="c" className="tb-mono">{d.code}</span>,
          d.name,
          <StatusBadge key="s" status={d.status} />,
          <TestsCell key="t" d={d} />,
        ])}
      />
    </>
  );
}

function Schedule(c: Ctx) {
  const { snapshot, derived } = c;
  const contractual = Object.values(snapshot.schedule.milestones).filter((m) => m.type === 'Contratual').sort(byCode);
  const packages = Object.values(snapshot.scope.wbs);
  const critical = derived.schedule.ok
    ? Object.values(derived.schedule.tasks)
        .filter((t) => t.critical)
        .sort((a, b) => a.start.localeCompare(b.start))
    : [];
  return (
    <>
      <Sub>Marcos contratuais</Sub>
      <Table
        label="Marcos contratuais"
        head={['Marco', 'Nome', 'LB', 'Previsto / real', 'Desvio (dias)', 'Status']}
        empty="Nenhum marco contratual."
        rows={contractual.map((m) => {
          const d = derived.milestones[m.id];
          return [
            <span key="c" className="tb-mono">{m.code}</span>,
            m.name,
            <span key="b" className="tb-mono">{formatDateBR(d?.baselineDate ?? null)}</span>,
            <span key="f" className="tb-mono">{formatDateBR(m.actualDate ?? d?.forecast ?? null)}</span>,
            <span key="v" className="tb-mono">{d?.deviationDays ?? '—'}</span>,
            d ? <StatusBadge key="s" status={d.status} /> : '—',
          ];
        })}
      />
      <Sub>Caminho crítico</Sub>
      {!derived.schedule.ok ? (
        <p className="muted small">Ciclo entre predecessores: corrija a EAP para calcular o caminho crítico.</p>
      ) : (
        <Table
          label="Caminho crítico"
          head={['EAP', 'Pacote', 'Início', 'Término']}
          empty="Sem pacotes no caminho crítico."
          rows={critical.map((t) => {
            const p = packages.find((n) => n.id === t.id);
            return [
              <span key="c" className="tb-mono">{p?.code ?? '—'}</span>,
              p?.name ?? '—',
              <span key="s" className="tb-mono">{formatDateBR(t.start)}</span>,
              <span key="f" className="tb-mono">{formatDateBR(t.finish)}</span>,
            ];
          })}
        />
      )}
    </>
  );
}

function Finances(c: Ctx) {
  const fin = c.derived.finances;
  if (!fin) return <p className="muted small">Custos & Finanças desligado.</p>;
  const m = money(c);
  const penalty = c.derived.penalty;
  const { total, byCategory } = fin.summary;
  const tiles: [string, string][] = [
    ['BAC', m(fin.evm.bac)],
    ['PV', m(fin.evm.pv)],
    ['EV', m(fin.evm.ev)],
    ['AC', m(fin.evm.ac)],
    ['CPI', formatRatio(fin.evm.cpi)],
    ['SPI', formatRatio(fin.evm.spi)],
    ['EAC', m(fin.evm.eac)],
  ];
  return (
    <>
      <div className="grid report-kpis">
        {tiles.map(([label, value]) => (
          <KpiTile key={label} label={label} value={value} />
        ))}
        <KpiTile
          label="Multa por atraso (provisão)"
          value={penalty ? m(penalty.totalCents) : 'n/a'}
          hint={penalty ? `${penalty.items.length} marco(s) contratual(is) atrasado(s)` : 'Cláusula de multa não configurada'}
        />
      </div>
      <Sub>Orçado × comprometido × realizado</Sub>
      <Table
        label="Orçado × comprometido × realizado"
        head={['Categoria', 'Orçado', 'Comprometido', 'Realizado']}
        empty="Sem itens de custo."
        rows={[
          ...Object.entries(byCategory).map(([cat, t]) => [cat, m(t.budgeted), m(t.committed), m(t.actual)]),
          [<strong key="t">Total</strong>, m(total.budgeted), m(total.committed), m(total.actual)],
        ].map((r) => r.map((cell, i) => (i === 0 ? cell : <span key={i} className="tb-mono">{cell}</span>)))}
      />
      <Sub>Curva S</Sub>
      {fin.moneySCurve.length > 0 ? <SCurveSvg points={fin.moneySCurve} /> : <p className="muted small">Defina a linha de base para ver a Curva S.</p>}
    </>
  );
}

function Risks(c: Ctx) {
  const { snapshot, derived, config } = c;
  if (!derived.risks) return <p className="muted small">Riscos desligado.</p>;
  const settings = config.settings.risks;
  const levels = levelsFor(settings.scale);
  const labels = levelLabels(settings.scale);
  const bandAt = (p: number, i: number) => {
    const e = exposure({ id: '', nature: 'Ameaça', status: 'Identificado', probability: p, impact: i, probabilityPct: null, costImpactCents: null }, settings);
    return e === 'Não avaliado' ? 'Baixo' : e.band;
  };
  const open = Object.values(snapshot.risks.risks)
    .filter(isOpen)
    .map((r) => ({ r, e: exposure(r, settings) }))
    .filter((x): x is { r: typeof x.r; e: { score: number; band: Band } } => x.e !== 'Não avaliado' && (x.e.band === 'Alto' || x.e.band === 'Crítico'))
    .sort((a, b) => b.e.score - a.e.score || byCode(a.r, b.r));
  return (
    <>
      <ul className="band-list report-bands" aria-label="Riscos abertos por faixa">
        {[...BANDS].reverse().map((b) => (
          <li key={b}>
            <Badge text={b} tone={BAND_TONE[b] as 'red'} /> <span className="tb-mono">{derived.risks!.byBand[b]}</span>
          </li>
        ))}
        <li>
          <Badge text="Não avaliado" tone="gray" /> <span className="tb-mono">{derived.risks.byBand['Não avaliado']}</span>
        </li>
      </ul>
      <Sub>{`Matriz ${settings.scale}×${settings.scale}`}</Sub>
      <table className="report-matrix" aria-label="Matriz probabilidade × impacto">
        <tbody>
          {[...levels].reverse().map((p) => (
            <tr key={p}>
              <th scope="row">{labels.probability[p - 1]}</th>
              {levels.map((i) => {
                const n = derived.risks!.matrix.cells[`${p}-${i}`]?.length ?? 0;
                const band = bandAt(p, i);
                return (
                  <td key={i} style={{ background: `var(--${BAND_TONE[band]}-soft)`, color: `var(--${BAND_TONE[band]})` }} title={band}>
                    {n || ''}
                  </td>
                );
              })}
            </tr>
          ))}
          <tr>
            <th scope="row" className="muted small">P ↑ · I →</th>
            {levels.map((i) => (
              <th key={i} scope="col" className="small">
                {labels.impact[i - 1]}
              </th>
            ))}
          </tr>
        </tbody>
      </table>
      <Sub>Riscos abertos Alto/Crítico</Sub>
      <Table
        label="Riscos abertos Alto/Crítico"
        head={['Código', 'Risco', 'P × I', 'Exposição', 'Responsável', 'Resposta']}
        empty="Nenhum risco aberto Alto ou Crítico."
        rows={open.map(({ r, e }) => [
          <span key="c" className="tb-mono">{r.code}</span>,
          r.title,
          <span key="pi" className="tb-mono">
            {r.probability}×{r.impact}
          </span>,
          <Badge key="b" text={`${e.score} · ${e.band}`} tone={BAND_TONE[e.band] as 'red'} />,
          partyName(c, r.ownerId),
          r.responseAction || '—',
        ])}
      />
    </>
  );
}

function ResourcesStakeholders(c: Ctx) {
  const { snapshot, derived, config } = c;
  const res = derived.resources;
  const comms = Object.values(snapshot.stakeholders.communications)
    .map((x) => ({ x, status: communicationStatus(x, derived.statusDate) }))
    .filter((y) => y.status !== 'Em dia')
    .sort((a, b) => byCode(a.x, b.x));
  const suppliers = Object.values(snapshot.stakeholders.parties)
    .filter((p): p is Organization => p.kind === 'Organização' && (p.roles.includes('Fornecedor') || p.roles.includes('Prestador de serviço')))
    .sort(byCode);
  const m = money(c);
  return (
    <>
      {config.enabled.resources && res && (
        <>
          <Sub>Carga de recursos</Sub>
          <Table
            label="Carga de recursos"
            head={['Recurso', 'Pico da demanda', 'Situação']}
            empty="Nenhuma alocação ativa."
            rows={res.load
              .filter((l) => l.weeks.some((w) => w.demandPct > 0))
              .map((l) => {
                const r = snapshot.resources.resources[l.resourceId as keyof typeof snapshot.resources.resources];
                const peak = Math.max(...l.weeks.map((w) => (w.demandPct * 100) / w.capacityPct));
                const over = res.overallocated.includes(l.resourceId);
                return [
                  `${r?.code ?? ''} ${r?.name ?? ''}`.trim(),
                  <span key="p" className="tb-mono">{formatPercent(peak)}</span>,
                  <StatusBadge key="s" status={over ? 'Sobrealocado' : 'Dentro da capacidade'} />,
                ];
              })}
          />
        </>
      )}
      {config.enabled.stakeholders && (
        <>
          <Sub>Comunicações pendentes</Sub>
          <Table
            label="Comunicações pendentes"
            head={['Código', 'Informação', 'Próxima data', 'Status']}
            empty="Nenhuma comunicação atrasada ou sem data."
            rows={comms.map(({ x, status }) => [
              <span key="c" className="tb-mono">{x.code}</span>,
              x.information,
              <span key="d" className="tb-mono">{formatDateBR(x.nextDate)}</span>,
              <StatusBadge key="s" status={status} />,
            ])}
          />
          <Sub>Fornecedores</Sub>
          <Table
            label="Fornecedores"
            head={config.enabled.finances ? ['Fornecedor', 'Comprometido', 'Entregas atrasadas'] : ['Fornecedor', 'Papéis']}
            empty="Nenhum fornecedor ou prestador de serviço."
            rows={suppliers.map((o) => {
              if (!config.enabled.finances) return [`${o.code} ${o.name}`, o.roles.join(', ')];
              const panel = supplierPanel(snapshot, derived, o.id);
              const late = panel.procurements.filter((p) => p.late).map((p) => p.code);
              return [
                `${o.code} ${o.name}`,
                <span key="m" className="tb-mono">{m(panel.totals.committed)}</span>,
                late.length ? <Badge key="l" text={late.join(', ')} tone="red" /> : <span key="l" className="muted">nenhuma</span>,
              ];
            })}
          />
        </>
      )}
    </>
  );
}

export const SECTION_BODY: Record<ReportSectionId, (c: Ctx) => ReactNode> = {
  overview: Overview,
  governance: Governance,
  scope: Scope,
  schedule: Schedule,
  finances: Finances,
  risks: Risks,
  resources_stakeholders: ResourcesStakeholders,
};

export type { Ctx as ReportContext };
