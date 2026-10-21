import { roundHalfEven } from '@/shared/lib/money';
import type { GovernanceProfile } from '../model/profile';

type Clause = GovernanceProfile['latePenalty'];

export type PenaltyInput = { id: string; delayDays: number; baseCents: number };
export type PenaltyItem = { id: string; delayDays: number; periods: number; penaltyCents: number };
export type PenaltyResult = { items: PenaltyItem[]; totalCents: number; capCents: number | null; capped: boolean };

/** Períodos de atraso: dias corridos, ou semanas contando a fração (⌈dias/7⌉). */
function periodsOf(clause: Clause, delayDays: number): number {
  if (delayDays <= 0) return 0;
  return clause.period === 'Semanal' ? Math.ceil(delayDays / 7) : delayDays;
}

/** Multa por marco = base × % × períodos; total limitado pelo teto (% do valor do contrato). Pura (D7). */
export function latePenalty(clause: Clause, inputs: PenaltyInput[]): PenaltyResult {
  const rate = (clause.ratePct ?? 0) / 100;
  const items = inputs.map((i) => {
    const periods = periodsOf(clause, i.delayDays);
    return { id: i.id, delayDays: Math.max(0, i.delayDays), periods, penaltyCents: roundHalfEven(i.baseCents * rate * periods) };
  });
  const sum = items.reduce((s, i) => s + i.penaltyCents, 0);
  const capCents =
    clause.capPct !== null && clause.contractValueCents !== null
      ? roundHalfEven((clause.contractValueCents * clause.capPct) / 100)
      : null;
  const capped = capCents !== null && sum > capCents;
  return { items, totalCents: capped ? capCents : sum, capCents, capped };
}

const pct = (n: number) => `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 4 }).format(n)}%`;

/** "0,1% por dia sobre o valor do contrato · teto 10%" — a cláusula em uma linha. */
export function describePenaltyClause(c: Clause): string {
  const period = c.period === 'Semanal' ? 'por semana ou fração' : 'por dia';
  const base = c.base === 'Valor do marco' ? 'sobre o valor do marco' : 'sobre o valor do contrato';
  const cap = c.capPct === null ? 'sem teto' : `teto ${pct(c.capPct)}`;
  return `${pct(c.ratePct ?? 0)} ${period} ${base} · ${cap}`;
}
