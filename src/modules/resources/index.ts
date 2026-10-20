import type { AllocationId, ResourceId } from '@/core/ids';
import type { Allocation } from './model/allocation';
import type { Resource } from './model/resource';

export * from './model/resource';
export * from './model/allocation';
export * from './domain/load';
export * from './domain/rag';
export { resourcesManifest, resourcesSettingsSchema, type ResourcesSettings } from './manifest';

export type ResourcesData = {
  resources: Record<ResourceId, Resource>;
  allocations: Record<AllocationId, Allocation>;
};

export function emptyResourcesData(): ResourcesData {
  return { resources: {}, allocations: {} };
}
