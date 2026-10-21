import type { Alert } from '@/core/indicators';
import type { ImplementedModuleId } from '@/project/registry';
import type { AnalysisContext } from '../context';
import { baselinePackageDeleted } from './baseline-package-deleted';
import { deliverableOverdue } from './deliverable-overdue';
import { milestoneDeviation } from './milestone-deviation';
import { staleChangeRequest } from './stale-change-request';
import type { AlertRule } from './types';

export type { AlertRule } from './types';

export const ALERT_RULES: AlertRule[] = [milestoneDeviation, staleChangeRequest, deliverableOverdue, baselinePackageDeleted];

/** Alertas do módulo, só de regras cujos módulos requeridos estão ligados. */
export function moduleAlerts(ctx: AnalysisContext, module: ImplementedModuleId): Alert[] {
  return ALERT_RULES.filter((r) => r.module === module && r.requires.every((m) => ctx.config.enabled[m])).flatMap(
    (r) => r.evaluate(ctx),
  );
}
