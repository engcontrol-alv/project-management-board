import type { Rag } from '@/core/indicators';
import { diffDays, type IsoDate } from '@/shared/lib/dates';
import type { GovernanceProfile } from '../model/profile';

const PENDING = new Set(['Solicitada', 'Em análise']);

/** Mudanças aguardando decisão há mais de `days` dias. */
export function staleChangeRequests<T extends { status: string; requestDate: IsoDate }>(
  crs: T[],
  statusDate: IsoDate,
  days: number,
): T[] {
  return crs.filter((c) => PENDING.has(c.status) && diffDays(c.requestDate, statusDate) > days);
}

export function governanceRag(staleCount: number): { rag: Rag; reason: string } {
  if (staleCount === 0) return { rag: 'verde', reason: 'Nenhuma mudança parada' };
  return { rag: 'amarelo', reason: `${staleCount} mudança(s) aguardando decisão além do prazo` };
}

export function isReadOnly(p: GovernanceProfile): boolean {
  return p.charter.status === 'Encerrado';
}
