import { BANDS, expectedValue, exposure, isOpen, riskMatrix, type Band, type Risk, type RisksSettings } from '@/modules/risks';
import type { ProjectSnapshot } from '@/project/snapshot';

export type CategoryExposure = { category: string; count: number; score: number; emv: number };

export type DerivedRisks = {
  matrix: ReturnType<typeof riskMatrix>;
  /** Riscos abertos por categoria: quantidade, soma das pontuações e valor esperado. */
  byCategory: CategoryExposure[];
  /** Σ valor esperado das ameaças abertas (comparado à contingência). */
  openEmv: number;
  /** Riscos abertos por faixa de exposição (KPI "riscos por faixa" do painel). */
  byBand: Record<Band | 'Não avaliado', number>;
};

export function deriveRisks(s: ProjectSnapshot, settings: RisksSettings): DerivedRisks {
  const risks = Object.values(s.risks.risks);
  const open = risks.filter(isOpen);
  const byCategory = new Map<string, CategoryExposure>();
  for (const r of open) {
    const c = byCategory.get(r.category) ?? { category: r.category, count: 0, score: 0, emv: 0 };
    const e = exposure(r, settings);
    c.count += 1;
    c.score += e === 'Não avaliado' ? 0 : e.score;
    c.emv += expectedValue(r) ?? 0;
    byCategory.set(r.category, c);
  }
  const byBand = Object.fromEntries([...BANDS, 'Não avaliado'].map((b) => [b, 0])) as DerivedRisks['byBand'];
  for (const r of open) {
    const e = exposure(r, settings);
    byBand[e === 'Não avaliado' ? e : e.band] += 1;
  }
  return {
    byBand,
    matrix: riskMatrix(risks),
    byCategory: [...byCategory.values()].sort((a, b) => b.score - a.score),
    openEmv: open.reduce((sum, r: Risk) => sum + (expectedValue(r) ?? 0), 0),
  };
}
