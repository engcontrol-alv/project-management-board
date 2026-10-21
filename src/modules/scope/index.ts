import type {
  DeliverableId,
  RequirementId,
  WorkPackageId,
} from '@/core/ids';
import type { Requirement } from './model/requirement';
import type { WbsNode } from './model/wbs';
import type { Deliverable } from './model/deliverable';

export * from './model/requirement';
export * from './model/wbs';
export * from './model/deliverable';
export * from './domain/requirements';
export * from './domain/cycles';
export * from './domain/deliverables';
export * from './domain/acceptance';
export { scopeManifest } from './manifest';

export type ScopeData = {
  requirements: Record<RequirementId, Requirement>;
  wbs: Record<WorkPackageId, WbsNode>;
  deliverables: Record<DeliverableId, Deliverable>;
};

export function emptyScopeData(): ScopeData {
  return { requirements: {}, wbs: {}, deliverables: {} };
}
