import type { Risk, RiskScale } from '../model/risk';

/** 3→5: 1→1, 2→3, 3→5. 5→3: 1–2→1, 3→2, 4–5→3. Preserva a faixa de exposição dos 9 pares 3×3. */
const CONVERT: Record<`${RiskScale}>${RiskScale}`, (n: number) => number> = {
  '3>5': (n) => 2 * n - 1,
  '5>3': (n) => (n <= 2 ? 1 : n === 3 ? 2 : 3),
  '3>3': (n) => n,
  '5>5': (n) => n,
};

/**
 * Troca de escala sem perda de dados (D1): converte os níveis e guarda a avaliação anterior em
 * `reassess` ("Reavaliar"). Se o risco ainda não foi reavaliado e a escala volta à original,
 * restaura os níveis exatos. Risco não avaliado fica intacto.
 */
export function rescaleRisk(r: Risk, from: RiskScale, to: RiskScale): Risk {
  if (from === to || r.probability === null || r.impact === null) return r;
  if (r.reassess && r.reassess.scale === to)
    return { ...r, probability: r.reassess.probability, impact: r.reassess.impact, reassess: null };
  const convert = CONVERT[`${from}>${to}`];
  return {
    ...r,
    probability: convert(r.probability),
    impact: convert(r.impact),
    reassess: r.reassess ?? { scale: from, probability: r.probability, impact: r.impact },
  };
}
