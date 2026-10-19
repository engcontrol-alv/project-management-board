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

export type ModuleIndicators = {
  rag: Rag;
  ragReason: string;
  kpis: Indicator[];
  alerts: Alert[];
};

const SEVERITY: Record<Rag, number> = { 'n/a': -1, verde: 0, amarelo: 1, vermelho: 2 };

/** O pior status entre os informados, ignorando "n/a" (todos "n/a" → "n/a"). */
export function worstRag(rags: Rag[]): Rag {
  return rags.reduce<Rag>((worst, r) => (SEVERITY[r] > SEVERITY[worst] ? r : worst), 'n/a');
}
