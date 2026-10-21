import { lazy, Suspense } from 'react';
import { Badge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { Money } from './common';

const CashflowChart = lazy(() => import('./CashflowChart'));

const monthLabel = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

/** Fluxo de caixa derivado (sem cadastro próprio): previsto × realizado por mês (SPEC §6.4d). */
export function CashflowPage() {
  const analysis = useAnalysis();
  const f = analysis?.derived.finances;
  if (!f) return null;
  const { cashflow, baseCurrency: cur } = f;
  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Fluxo de caixa</h1>
      </div>
      {cashflow.months.length > 0 && (
        <div className="card tb-card">
          <Suspense fallback={<p className="muted">Carregando gráfico…</p>}>
            <CashflowChart months={cashflow.months} currency={cur} />
          </Suspense>
        </div>
      )}
      <div className="card tb-card flush">
        {cashflow.months.length === 0 ? (
          <p className="muted" style={{ padding: 16, margin: 0 }}>
            Cadastre linhas de orçamento ou contratações com datas para ver o fluxo de caixa.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="tbl" aria-label="Fluxo de caixa mensal">
              <thead>
                <tr>
                  <th>Mês</th>
                  <th>Custo previsto</th>
                  <th>Custo realizado</th>
                  <th>Receita prevista</th>
                  <th>Receita realizada</th>
                </tr>
              </thead>
              <tbody>
                {cashflow.months.map((m) => (
                  <tr key={m.month}>
                    <td className="tb-mono">{monthLabel(m.month)}</td>
                    <td><Money cents={m.plannedCost} currency={cur} /></td>
                    <td><Money cents={m.actualCost} currency={cur} /></td>
                    <td><Money cents={m.plannedRevenue} currency={cur} /></td>
                    <td><Money cents={m.actualRevenue} currency={cur} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {cashflow.atRisk.length > 0 && (
        <p className="notice">
          <Badge text="Risco de deslocamento" tone="amber" /> Itens ligados a pacotes atrasados:{' '}
          <span className="tb-mono">{cashflow.atRisk.join(', ')}</span>
        </p>
      )}
      <section className="card tb-card" aria-label="Itens sem data">
        <h2>Itens sem data</h2>
        <p className="small" style={{ margin: 0 }}>
          {cashflow.undated.length === 0 ? (
            <span className="muted">Nenhum.</span>
          ) : (
            <span className="tb-mono">{cashflow.undated.join(', ')}</span>
          )}
        </p>
      </section>
    </div>
  );
}
