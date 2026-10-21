import type { ChangeRequestId } from '@/core/ids';
import { err, ok } from '@/core/result';
import type { ChangeRequest } from '@/modules/scope';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject, effectiveStatusDate } from '@/analytics/derive';
import { guard } from './guard';
import type { Command } from './run';

/** LB v1: fotografia do plano atual, sem mudança associada. */
export const defineInitialBaseline = (): Command =>
  guard((s, ctx) => {
    if (s.baselines.length) return err(['Linha de base já definida']);
    const d = deriveProject(s, effectiveStatusDate(s.project, ctx.today));
    if (!d.schedule.ok) return err(['A EAP tem dependência circular']);
    return ok({
      puts: [],
      deletes: [],
      appendBaseline: snapshotBaseline(s, d, { id: ctx.newId(), now: ctx.now, changeRequestId: null }),
    });
  });

/** LB v2+: nova versão vinculada à mudança aprovada, que passa a `Implementada` — numa única gravação. */
export const applyChangeToBaseline = (crId: string): Command =>
  guard((s, ctx) => {
    const cr = s.scope.changeRequests[crId as ChangeRequest['id']];
    if (!cr || cr.status !== 'Aprovada')
      return err(['Apenas mudanças aprovadas podem ser aplicadas à linha de base.']);
    if (!s.baselines.length) return err(['Defina a linha de base inicial antes.']);
    const d = deriveProject(s, effectiveStatusDate(s.project, ctx.today));
    if (!d.schedule.ok) return err(['A EAP tem dependência circular']);
    return ok({
      project: { ...s.project, updatedAt: ctx.now },
      appendBaseline: snapshotBaseline(s, d, {
        id: ctx.newId(),
        now: ctx.now,
        changeRequestId: cr.id as ChangeRequestId,
      }),
      puts: [{ table: 'scope_changeRequests', value: { ...cr, status: 'Implementada' } }],
      deletes: [],
    });
  });
