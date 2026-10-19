import type { CollectionDef, ModuleId, ModuleManifest } from '@/core/module-contract';
import { governanceManifest } from '@/modules/governance';
import { scopeManifest } from '@/modules/scope';
import { scheduleManifest } from '@/modules/schedule';
import { stakeholdersManifest } from '@/modules/stakeholders';

/** Módulos implementados nesta etapa (cresce a cada etapa). */
export type ImplementedModuleId = 'governance' | 'scope' | 'schedule' | 'stakeholders';

export const MANIFESTS = {
  governance: governanceManifest,
  scope: scopeManifest,
  schedule: scheduleManifest,
  stakeholders: stakeholdersManifest,
} satisfies { [K in ImplementedModuleId]: ModuleManifest };

/** Ordem de exibição: Governança primeiro. */
export const MODULE_ORDER: ImplementedModuleId[] = ['governance', 'scope', 'schedule', 'stakeholders'];

export function isImplemented(id: string): id is ImplementedModuleId {
  return (MODULE_ORDER as string[]).includes(id);
}

export function manifestOf(id: ModuleId): ModuleManifest | undefined {
  return isImplemented(id) ? MANIFESTS[id] : undefined;
}

export const ALL_COLLECTIONS: CollectionDef[] = MODULE_ORDER.flatMap(
  (id) => MANIFESTS[id].collections,
);

export function getCollection(module: ModuleId, name: string): CollectionDef | undefined {
  return ALL_COLLECTIONS.find((c) => c.module === module && c.name === name);
}

export function collectionByTable(table: string): CollectionDef | undefined {
  return ALL_COLLECTIONS.find((c) => c.table === table);
}
