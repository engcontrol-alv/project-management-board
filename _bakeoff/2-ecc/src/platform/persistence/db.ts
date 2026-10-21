import Dexie from 'dexie';
import type { ModuleManifest } from '@/core/module-contract';
import { SCHEMA_VERSION } from '@/project/migrations';
import { MANIFESTS } from '@/project/registry';

export const PROJECTS_TABLE = 'core_projects';
export const BASELINES_TABLE = 'core_baselines';

/** Schema Dexie gerado dos manifests: uma tabela por coleção, indexada por projectId. */
export function buildStores(manifests: Record<string, ModuleManifest>): Record<string, string> {
  const stores: Record<string, string> = { [PROJECTS_TABLE]: 'id', [BASELINES_TABLE]: 'id, projectId' };
  for (const m of Object.values(manifests)) for (const c of m.collections) stores[c.table] = 'id, projectId';
  return stores;
}

export function createDb(name = 'pmb'): Dexie {
  const db = new Dexie(name);
  db.version(SCHEMA_VERSION).stores(buildStores(MANIFESTS));
  return db;
}
