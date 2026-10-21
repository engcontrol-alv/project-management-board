import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { formatMoneyBR } from '@/shared/lib/money';
import { Badge } from '@/shared/ui/Badge';
import { DataTable } from '@/shared/ui/DataTable';
import { KpiTile } from '@/shared/ui/KpiTile';
import { useAnalysis } from '@/platform/react/hooks';
import type { Totals } from '../domain/money-summary';
import { Money } from './common';

type TotalsRow = Totals & { id: string; label: string };

function TotalsTable({ rows, currency, title }: { rows: TotalsRow[]; currency: string; title: string }) {
  return (
    <section className="card tb-card flush" aria-label={title}>
      <div className="card-head" style={{ padding: '14px 18px 0' }}>
        <h2>{title}</h2>
      </div>
      <DataTable<TotalsRow>
        rows={rows}
        empty="Sem itens de custo."
        columns={[
          { key: 'label', label: '' },
          { key: 'budgeted', label: 'Orçado', render: (r) => <Money cents={r.budgeted} currency={currency} /> },
          { key: 'committed', label: 'Comprometido', render: (r) => <Money cents={r.committed} currency={currency} /> },
          { key: 'actual', label: 'Realizado', render: (r) => <Money cents={r.actual} currency={currency} /> },
        ]}
      />
    </section>
  );
}

/** Orçado × comprometido × realizado, saldo livre e contingência (SPEC §6.4c, e). */
export function SummaryPage() {
  const analysis = useAnalysis();
  const f = analysis?.derived.finances;
  if (!analysis || !f) return null;
  const { summary, contingency: c, baseCurrency: cur } = f;
  const negative = summary.freeBalance < 0;
  const penalty = analysis.derived.penalty;
  const penaltyHint = penalty
    ? penalty.reason ?? `${penalty.items.length} marco(s) contratual(is) atrasado(s)`
    : analysis.snapshot.governance.profile.latePenalty.enabled
      ? 'Cronograma desligado'
      : 'Cláusula de multa não configurada';
  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Resumo financeiro</h1>
      </div>
      <div className="grid" style={{ marginBottom: 16 }}>
        <KpiTile label="Orçado" value={formatMoneyBR(summary.total.budgeted, cur)} />
        <KpiTile label="Comprometido" value={formatMoneyBR(summary.total.committed, cur)} />
        <KpiTile label="Realizado" value={formatMoneyBR(summary.total.actual, cur)} />
        <KpiTile label="Saldo livre" value={formatMoneyBR(summary.freeBalance, cur)}>
          {negative && <Badge text="Saldo negativo" tone="red" />}
        </KpiTile>
        <KpiTile
          label="Multa por atraso (provisão)"
          value={penalty?.totalCents !== null && penalty?.totalCents !== undefined ? formatMoneyBR(penalty.totalCents, cur) : 'n/a'}
          hint={penaltyHint}
        >
          {penalty?.capped && <Badge text="Teto atingido" tone="red" />}
        </KpiTile>
      </div>
      {penalty && (
        <section className="card tb-card flush" aria-label="Multa contratual por atraso">
          <div className="card-head" style={{ padding: '14px 18px 0' }}>
            <h2>Multa contratual por atraso</h2>
            <span className="muted small">{penalty.clauseText}</span>
          </div>
          <DataTable
            rows={penalty.items.map((i) => ({ ...i, id: i.milestoneId }))}
            empty="Nenhum marco contratual atrasado."
            columns={[
              { key: 'code', label: 'Marco', mono: true },
              { key: 'name', label: 'Nome' },
              { key: 'dueDate', label: 'Prazo contratual', mono: true, render: (i) => formatDateBR(i.dueDate) },
              { key: 'endDate', label: 'Real / previsto', mono: true, render: (i) => formatDateBR(i.endDate) },
              { key: 'delayDays', label: 'Dias de atraso', mono: true },
              {
                key: 'penaltyCents',
                label: 'Multa',
                render: (i) => (i.penaltyCents === null ? 'n/a' : <Money cents={i.penaltyCents} currency={cur} />),
              },
            ]}
          />
        </section>
      )}
      <div className="split">
        <TotalsTable
          title="Por natureza"
          currency={cur}
          rows={(['CAPEX', 'OPEX'] as const).map((n) => ({ id: n, label: n, ...summary.byNature[n] }))}
        />
        <TotalsTable
          title="Por categoria"
          currency={cur}
          rows={Object.entries(summary.byCategory).map(([k, t]) => ({ id: k, label: k, ...t }))}
        />
      </div>
      <section className="card tb-card" aria-label="Contingência">
        <div className="card-head">
          <h2>Contingência</h2>
          <Badge
            text={c.coversRisks ? 'Cobre os riscos abertos' : 'Não cobre os riscos abertos'}
            tone={c.coversRisks ? 'green' : 'red'}
          />
        </div>
        <dl className="def-list">
          <dt>Reserva</dt>
          <dd>
            <Money cents={c.reserve} currency={cur} />
          </dd>
          <dt>Consumido</dt>
          <dd>
            <Money cents={c.consumed} currency={cur} /> <span className="muted">({formatPercent(c.consumedPct)})</span>
          </dd>
          <dt>Saldo</dt>
          <dd>
            <Money cents={c.balance} currency={cur} />
          </dd>
          <dt>Valor esperado dos riscos abertos</dt>
          <dd>
            <Money cents={c.openRiskEmv} currency={cur} />
          </dd>
        </dl>
      </section>
    </div>
  );
}
