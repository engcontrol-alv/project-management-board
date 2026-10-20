export const BANDS = ['Baixo', 'Moderado', 'Alto', 'Crítico'] as const;
export type Band = (typeof BANDS)[number];

type Assessable = {
  id: string;
  nature: string;
  status: string;
  probability: number | null;
  impact: number | null;
  probabilityPct: number | null;
  costImpactCents: number | null;
};

export type BandLimits = { low: number; moderate: number; high: number };

export function bandOf(score: number, bands: BandLimits): Band {
  if (score <= bands.low) return 'Baixo';
  if (score <= bands.moderate) return 'Moderado';
  if (score <= bands.high) return 'Alto';
  return 'Crítico';
}

/** Pontuação P × I e faixa (SPEC §8.4); sem P ou I = "Não avaliado". */
export function exposure(r: Assessable, settings: { bands: BandLimits }): { score: number; band: Band } | 'Não avaliado' {
  if (r.probability === null || r.impact === null) return 'Não avaliado';
  const score = r.probability * r.impact;
  return { score, band: bandOf(score, settings.bands) };
}

/** Valor esperado = probabilidade % × impacto em custo (só ameaças). */
export function expectedValue(r: Assessable): number | null {
  if (r.nature !== 'Ameaça' || r.probabilityPct === null || r.costImpactCents === null) return null;
  return Math.round((r.probabilityPct / 100) * r.costImpactCents);
}

export function isOpen(r: { status: string }): boolean {
  return r.status !== 'Encerrado';
}

/** Células `"P-I"` com os riscos avaliados; os sem nível ficam em `unassessed`. */
export function riskMatrix(risks: Assessable[]): { cells: Record<string, string[]>; unassessed: string[] } {
  const cells: Record<string, string[]> = {};
  const unassessed: string[] = [];
  for (const r of risks) {
    if (r.probability === null || r.impact === null) unassessed.push(r.id);
    else (cells[`${r.probability}-${r.impact}`] ??= []).push(r.id);
  }
  return { cells, unassessed };
}
