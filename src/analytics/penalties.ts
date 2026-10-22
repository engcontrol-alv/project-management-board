import type { MilestoneId } from '@/core/ids';
import { describePenaltyClause, latePenalty, type GovernanceProfile } from '@/modules/governance';
import { diffDays, maxDate, type IsoDate } from '@/shared/lib/dates';
import { toBaseCents } from '@/shared/lib/money';
import type { Baseline } from '@/project/baseline';
import type { ProjectSnapshot } from '@/project/snapshot';

export type PenaltyLine = {
  milestoneId: MilestoneId;
  code: string;
  name: string;
  /** Prazo contratual: data na LB vigente; sem LB, a data manual. */
  dueDate: IsoDate;
  /** Data real, se concluído; senão o maior entre previsão e data de status. */
  endDate: IsoDate;
  delayDays: number;
  periods: number;
  baseCents: number | null;
  penaltyCents: number | null;
};

export type DerivedPenalty = {
  clause: GovernanceProfile['latePenalty'];
  /** "0,1% por dia sobre o valor do contrato · teto 10%". */
  clauseText: string;
  /** Só marcos contratuais com atraso real ou previsto. */
  items: PenaltyLine[];
  /** `null` = n/a (motivo em `reason`). */
  totalCents: number | null;
  capCents: number | null;
  capped: boolean;
  reason: string | null;
};

/**
 * Provisão de multa contratual por atraso (D6, D7): projeção pura, nunca gravada.
 * `null` com a cláusula desativada; o chamador já não chama com o Cronograma desligado.
 */
export function derivePenalty(
  s: ProjectSnapshot,
  a: {
    forecasts: Record<string, IsoDate | null>;
    baseline: Baseline | null;
    statusDate: IsoDate;
    finances: { baseCurrency: string } | null;
  },
): DerivedPenalty | null {
  const clause = s.governance.profile.latePenalty;
  if (!clause.enabled) return null;
  const byMilestone = clause.base === 'Valor do marco';
  const revenueOf = (id: string) =>
    Object.values(s.finances.budgetLines)
      .filter((l) => l.kind === 'Receita' && l.status !== 'Cancelado' && l.milestoneId === id)
      .reduce(
        (sum, l) => sum + (l.currency === a.finances!.baseCurrency ? l.budgetedCents : toBaseCents(l.budgetedCents, l.rate ?? 1)),
        0,
      );

  const late = Object.values(s.schedule.milestones)
    .filter((m) => m.type === 'Contratual')
    .flatMap((m) => {
      const dueDate = a.baseline?.milestones[m.id]?.date ?? m.manualDate;
      if (!dueDate) return [];
      const endDate = m.actualDate ?? maxDate(a.forecasts[m.id] ?? a.statusDate, a.statusDate);
      const delayDays = diffDays(dueDate, endDate);
      if (delayDays <= 0) return [];
      const baseCents = byMilestone ? (a.finances ? revenueOf(m.id) : null) : clause.contractValueCents;
      return [{ m, dueDate, endDate, delayDays, baseCents }];
    })
    .sort((x, y) => x.m.code.localeCompare(y.m.code));

  const reason = byMilestone && !a.finances ? 'Finanças desligado: sem o valor do marco' : null;
  const result = latePenalty(
    clause,
    late.map((l) => ({ id: l.m.id, delayDays: l.delayDays, baseCents: l.baseCents ?? 0 })),
  );
  return {
    clause,
    clauseText: describePenaltyClause(clause),
    items: late.map((l, i) => ({
      milestoneId: l.m.id,
      code: l.m.code,
      name: l.m.name,
      dueDate: l.dueDate,
      endDate: l.endDate,
      delayDays: l.delayDays,
      periods: result.items[i]!.periods,
      baseCents: l.baseCents,
      penaltyCents: reason ? null : result.items[i]!.penaltyCents,
    })),
    totalCents: reason ? null : result.totalCents,
    capCents: result.capCents,
    capped: !reason && result.capped,
    reason,
  };
}
