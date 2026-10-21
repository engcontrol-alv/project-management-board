import type { CrStatus } from '../model/change-request';

const TRANSITIONS: Record<CrStatus, CrStatus[]> = {
  Solicitada: ['Em análise', 'Cancelada'],
  'Em análise': ['Aprovada', 'Rejeitada', 'Cancelada'],
  Aprovada: ['Implementada', 'Cancelada'],
  Rejeitada: [],
  Implementada: [],
  Cancelada: [],
};

export function allowedCrTransitions(from: CrStatus): CrStatus[] {
  return [...TRANSITIONS[from]];
}

export function isPendingCr(status: CrStatus): boolean {
  return status === 'Solicitada' || status === 'Em análise';
}
