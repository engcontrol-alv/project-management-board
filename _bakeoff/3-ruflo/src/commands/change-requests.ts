import type { ChangeRequestId, PartyId } from '@/core/ids';
import { err, ok } from '@/core/result';
import { allowedCrTransitions, type ChangeRequest, type CrStatus } from '@/modules/scope';
import type { IsoDate } from '@/shared/lib/dates';
import { guard } from './guard';
import type { Command } from './run';

export type CrDecision = { approverId: PartyId; decisionDate: IsoDate };

export const transitionChangeRequest = (
  id: ChangeRequestId,
  to: CrStatus,
  decision?: CrDecision,
): Command =>
  guard((s, ctx) => {
    const cr = s.scope.changeRequests[id];
    if (!cr) return err(['Mudança não encontrada.']);
    if (!allowedCrTransitions(cr.status).includes(to))
      return err([`Transição de "${cr.status}" para "${to}" não permitida.`]);
    if (to === 'Implementada' && s.baselines.length > 0) return err(['Use "Aplicar à linha de base".']);
    const next: ChangeRequest = { ...cr, status: to, ...(decision ?? {}) };
    return ok({
      project: { ...s.project, updatedAt: ctx.now },
      puts: [{ table: 'scope_changeRequests', value: next }],
      deletes: [],
    });
  });
