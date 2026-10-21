export type Rag = 'verde' | 'amarelo' | 'vermelho' | 'n/a';

export type Indicator = {
  id: string;
  label: string;
  value: number | null;
  format: 'ratio' | 'percent' | 'count' | 'days';
};

export type AlertAction =
  | { kind: 'openChangeRequest' }
  | { kind: 'openRecord'; module: string; collection: string; id: string };

export type Alert = {
  id: string;
  severity: 'amarelo' | 'vermelho';
  message: string;
  action?: AlertAction;
};

export type ModuleIndicators = { rag: Rag; ragReason: string; kpis: Indicator[]; alerts: Alert[] };

const RANK: Record<Exclude<Rag, 'n/a'>, number> = { verde: 0, amarelo: 1, vermelho: 2 };

/** Pior status entre os informados, ignorando "n/a"; vazio ou só "n/a" → "n/a". */
export function worstRag(rags: Rag[]): Rag {
  let worst: Rag = 'n/a';
  for (const r of rags) {
    if (r === 'n/a') continue;
    if (worst === 'n/a' || RANK[r] > RANK[worst]) worst = r;
  }
  return worst;
}

export type RagResult = { rag: Rag; reason: string };
