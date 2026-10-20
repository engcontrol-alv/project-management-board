import type { Rag } from '@/core/indicators';
import { exposure, isOpen, type BandLimits } from './exposure';

type RagRisk = Parameters<typeof exposure>[0];

/** RAG de Riscos (SPEC §9.1). */
export function risksRag(risks: RagRisk[], settings: { bands: BandLimits }): { rag: Rag; reason: string } {
  if (risks.length === 0) return { rag: 'n/a', reason: 'Nenhum risco registrado' };
  const open = risks.filter(isOpen);
  const band = (b: string) =>
    open.filter((r) => {
      const e = exposure(r, settings);
      return e !== 'Não avaliado' && e.band === b;
    }).length;
  const materialized = open.filter((r) => r.status === 'Materializado').length;
  const critical = band('Crítico');
  if (materialized > 0) return { rag: 'vermelho', reason: `${materialized} risco(s) materializado(s)` };
  if (critical > 0) return { rag: 'vermelho', reason: `${critical} risco(s) crítico(s) aberto(s)` };
  const high = band('Alto');
  if (high > 0) return { rag: 'amarelo', reason: `${high} risco(s) alto(s) aberto(s)` };
  return { rag: 'verde', reason: 'nenhum risco alto ou crítico aberto' };
}
