import type { RagResult } from '@/core/indicators';
import { diffDays, type IsoDate } from '@/shared/lib/dates';
import type { GovernanceProfile } from '../model/profile';

/** Mudanças `Solicitada`/`Em análise` há mais de `days` dias. */
export function staleChangeRequests<T extends { status: string; requestDate: IsoDate }>(
  crs: T[],
  statusDate: IsoDate,
  days: number,
): T[] {
  return crs.filter(
    (c) => (c.status === 'Solicitada' || c.status === 'Em análise') && diffDays(c.requestDate, statusDate) > days,
  );
}

export function governanceRag(staleCount: number): RagResult {
  if (staleCount > 0) return { rag: 'amarelo', reason: `${staleCount} mudança(s) aguardando decisão além do prazo` };
  return { rag: 'verde', reason: 'Nenhuma mudança parada' };
}

export function isReadOnly(p: GovernanceProfile): boolean {
  return p.charter.status === 'Encerrado';
}
