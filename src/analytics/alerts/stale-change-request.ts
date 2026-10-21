import { staleChangeRequests } from '@/modules/governance';
import { diffDays } from '@/shared/lib/dates';
import type { AlertRule } from './types';

export const staleChangeRequest: AlertRule = {
  id: 'stale-change-request',
  requires: ['scope'],
  evaluate: ({ snapshot, derived, config }) =>
    staleChangeRequests(
      Object.values(snapshot.governance.changeRequests),
      derived.statusDate,
      config.settings.governance.staleChangeDays,
    ).map((c) => ({
      id: `stale-change-request:${c.id}`,
      severity: 'amarelo' as const,
      message: `Mudança ${c.code} aguardando decisão há ${diffDays(c.requestDate, derived.statusDate)} dias`,
      action: { kind: 'openRecord' as const, module: 'governance', collection: 'changeRequests', id: c.id },
    })),
};
