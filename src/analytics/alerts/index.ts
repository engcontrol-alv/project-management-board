import { baselinePackageDeleted } from './baseline-package-deleted';
import { contingencyInsufficient } from './contingency-insufficient';
import { deliverableOverdue } from './deliverable-overdue';
import { milestoneDeviation } from './milestone-deviation';
import { procurementOverBudget, procurementThreatensMilestone } from './procurement-alerts';
import { staleChangeRequest } from './stale-change-request';
import { supplierDisengaged, supplierUnmonitored } from './supplier-alerts';
import type { AlertRule } from './types';

export type { AlertRule, AnalysisContext } from './types';

export const ALERT_RULES: AlertRule[] = [
  milestoneDeviation,
  staleChangeRequest,
  deliverableOverdue,
  baselinePackageDeleted,
  procurementThreatensMilestone,
  procurementOverBudget,
  contingencyInsufficient,
  supplierDisengaged,
  supplierUnmonitored,
];
