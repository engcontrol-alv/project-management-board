import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatMoneyBR } from '@/shared/lib/money';
import type { CashflowMonth } from '../domain/cashflow';

const label = (m: string) => `${m.slice(5, 7)}/${m.slice(0, 4)}`;

/** Carregado sob demanda (React.lazy): Recharts fica fora do bundle principal. */
export default function CashflowChart({ months, currency }: { months: CashflowMonth[]; currency: string }) {
  const data = months.map((m) => ({ ...m, label: label(m.month) }));
  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="var(--paper-line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} />
          <YAxis tickFormatter={(v: number) => formatMoneyBR(v, currency).replace(/,\d{2}$/, '')} tick={{ fontSize: 11, fontFamily: 'IBM Plex Mono' }} width={96} />
          <Tooltip formatter={(v: number) => formatMoneyBR(v, currency)} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="plannedCost" name="Custo previsto" fill="#aeb9c5" />
          <Bar dataKey="actualCost" name="Custo realizado" fill="var(--navy)" />
          <Bar dataKey="plannedRevenue" name="Receita prevista" fill="#bfdcd5" />
          <Bar dataKey="actualRevenue" name="Receita realizada" fill="var(--green)" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
