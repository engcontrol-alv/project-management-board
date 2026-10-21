import type { ChangeRequestId } from '@/core/ids';
import { err, ok } from '@/core/result';
import type { ChangeRequest } from '@/modules/governance';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject, effectiveStatusDate } from '@/analytics/derive';
import { guard } from './guard';
import type { Command } from './run';

/** LB v1, sem mudança. */
export const defineInitialBaseline = (): Command =>
  guard((s, ctx) => {
    if (s.baselines.length > 0) return err(['Linha de base já definida']);
    const derived = deriveProject(s, effectiveStatusDate(s.project, ctx.today));
    if (!derived.schedule.ok) return err(['A EAP tem dependência circular']);
    return ok({
      appendBaseline: snapshotBaseline(s, derived, { id: ctx.newId(), now: ctx.now, changeRequestId: null }),
      puts: [],
      deletes: [],
    });
  });

/** LB v(n+1) a partir de uma mudança `Aprovada`, que vira `Implementada` — na mesma transação. */
export const applyChangeToBaseline = (crId: ChangeRequestId): Command =>
  guard((s, ctx) => {
    const cr = s.governance.changeRequests[crId];
    if (!cr) return err(['Mudança não encontrada.']);
    if (cr.status !== 'Aprovada')
      return err(['Somente mudanças aprovadas podem ser aplicadas à linha de base.']);
    if (s.baselines.length === 0) return err(['Defina a linha de base inicial antes de aplicar mudanças.']);
    const derived = deriveProject(s, effectiveStatusDate(s.project, ctx.today));
    if (!derived.schedule.ok) return err(['A EAP tem dependência circular']);
    const implemented: ChangeRequest = { ...cr, status: 'Implementada' };
    return ok({
      appendBaseline: snapshotBaseline(s, derived, { id: ctx.newId(), now: ctx.now, changeRequestId: crId }),
      puts: [{ table: 'governance_changeRequests', value: implemented }],
      deletes: [],
    });
  });
