import type { IsoDate } from '@/shared/lib/dates';
import type { Level, Posture } from '../model/party';

export const QUADRANTS = ['Gerenciar de perto', 'Manter satisfeito', 'Manter informado', 'Monitorar'] as const;
export type Quadrant = (typeof QUADRANTS)[number];

/** Quadrante da matriz Poder × Interesse (SPEC §6.7). */
export function quadrant(a: { power: Level; interest: Level }): Quadrant {
  if (a.power === 'Alto') return a.interest === 'Alto' ? 'Gerenciar de perto' : 'Manter satisfeito';
  return a.interest === 'Alto' ? 'Manter informado' : 'Monitorar';
}

export function hasEngagementGap(a: { currentPosture: Posture; desiredPosture: Posture }): boolean {
  return a.currentPosture !== a.desiredPosture;
}

export type CommunicationStatus = 'Em dia' | 'Atrasada' | 'Sem data';

export function communicationStatus(c: { nextDate: IsoDate | null }, statusDate: IsoDate): CommunicationStatus {
  if (!c.nextDate) return 'Sem data';
  return c.nextDate < statusDate ? 'Atrasada' : 'Em dia';
}
