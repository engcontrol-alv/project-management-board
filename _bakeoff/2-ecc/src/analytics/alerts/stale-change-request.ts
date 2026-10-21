import { diffDays } from '@/shared/lib/dates';
import { staleChangeRequests } from '@/modules/governance';
import type { AlertRule } from './types';

export const staleChangeRequest: AlertRule = {
  id: 'stale-change-request',
  module: 'governance',
  requires: ['scope'],
  evaluate({ snapshot, derived, config }) {
    const stale = staleChangeRequests(
      Object.values(snapshot.scope.changeRequests),
      derived.statusDate,
      config.settings.governance.staleChangeDays,
    );
    return stale.map((c) => ({
      id: `stale-change-request:${c.id}`,
      severity: 'amarelo',
      message: `Mudança ${c.code} aguardando decisão há ${diffDays(c.requestDate, derived.statusDate)} dias`,
      action: { kind: 'openRecord', module: 'scope', collection: 'changeRequests', id: c.id },
    }));
  },
};
