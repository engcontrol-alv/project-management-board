import type { CollectionDef, ModuleId, ModuleManifest } from '@/core/module-contract';
import { financesManifest } from '@/modules/finances';
import { governanceManifest } from '@/modules/governance';
import { resourcesManifest } from '@/modules/resources';
import { risksManifest } from '@/modules/risks';
import { scopeManifest } from '@/modules/scope';
import { scheduleManifest } from '@/modules/schedule';
import { stakeholdersManifest } from '@/modules/stakeholders';

/** Módulos implementados (Etapa 2: os 7 domínios). */
export type ImplementedModuleId = ModuleId;

export const MANIFESTS = {
  governance: governanceManifest,
  scope: scopeManifest,
  schedule: scheduleManifest,
  finances: financesManifest,
  risks: risksManifest,
  resources: resourcesManifest,
  stakeholders: stakeholdersManifest,
} satisfies { [K in ImplementedModuleId]: ModuleManifest };

/** Ordem de exibição dos 7 domínios (barra, semáforo e configuração): Governança primeiro. */
export const MODULE_ORDER: ImplementedModuleId[] = [
  'governance',
  'scope',
  'schedule',
  'resources',
  'finances',
  'risks',
  'stakeholders',
];

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
