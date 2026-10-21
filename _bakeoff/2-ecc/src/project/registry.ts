import type { CollectionDef, ModuleId, ModuleManifest } from '@/core/module-contract';
import { stakeholdersManifest } from '@/modules/stakeholders';
import { scopeManifest } from '@/modules/scope';
import { scheduleManifest } from '@/modules/schedule';
import { governanceManifest } from '@/modules/governance';

/** Módulos implementados nesta etapa; cresce a cada etapa. */
export const IMPLEMENTED_MODULES = ['governance', 'scope', 'schedule', 'stakeholders'] as const;
export type ImplementedModuleId = (typeof IMPLEMENTED_MODULES)[number];

export const MANIFESTS = {
  governance: governanceManifest,
  scope: scopeManifest,
  schedule: scheduleManifest,
  stakeholders: stakeholdersManifest,
} satisfies { [K in ImplementedModuleId]: ModuleManifest };

export type Manifests = typeof MANIFESTS;

export const ALL_COLLECTIONS: CollectionDef[] = IMPLEMENTED_MODULES.flatMap((id) => MANIFESTS[id].collections);

export function isImplementedModule(id: string): id is ImplementedModuleId {
  return (IMPLEMENTED_MODULES as readonly string[]).includes(id);
}

export function getCollection(module: ModuleId | string, name: string): CollectionDef | undefined {
  return ALL_COLLECTIONS.find((c) => c.module === module && c.name === name);
}

export function collectionByTable(table: string): CollectionDef | undefined {
  return ALL_COLLECTIONS.find((c) => c.table === table);
}

export function constraintOf(module: ModuleId, name: string) {
  return isImplementedModule(module) ? MANIFESTS[module].constraints[name] : undefined;
}
