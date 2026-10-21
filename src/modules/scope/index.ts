import type {
  ChangeRequestId,
  DeliverableId,
  RequirementId,
  WorkPackageId,
} from '@/core/ids';
import type { Requirement } from './model/requirement';
import type { WbsNode } from './model/wbs';
import type { Deliverable } from './model/deliverable';
import type { ChangeRequest } from './model/change-request';

export * from './model/requirement';
export * from './model/wbs';
export * from './model/deliverable';
export * from './model/change-request';
export * from './domain/requirements';
export * from './domain/cycles';
export * from './domain/deliverables';
export * from './domain/acceptance';
export * from './domain/change-requests';
export { scopeManifest } from './manifest';

export type ScopeData = {
  requirements: Record<RequirementId, Requirement>;
  wbs: Record<WorkPackageId, WbsNode>;
  deliverables: Record<DeliverableId, Deliverable>;
  changeRequests: Record<ChangeRequestId, ChangeRequest>;
};

export function emptyScopeData(): ScopeData {
  return { requirements: {}, wbs: {}, deliverables: {}, changeRequests: {} };
}
