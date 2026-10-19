import { baselinePackageDeleted } from './baseline-package-deleted';
import { deliverableOverdue } from './deliverable-overdue';
import { milestoneDeviation } from './milestone-deviation';
import { staleChangeRequest } from './stale-change-request';
import type { AlertRule } from './types';

export type { AlertRule, AnalysisContext } from './types';

export const ALERT_RULES: AlertRule[] = [
  milestoneDeviation,
  staleChangeRequest,
  deliverableOverdue,
  baselinePackageDeleted,
];
