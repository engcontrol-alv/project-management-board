import Dexie from 'dexie';
import type { ModuleManifest } from '@/core/module-contract';
import { migrateProjectRow, migrateRows, SCHEMA_VERSION, STORES_V1 } from '@/project/migrations';
import { MANIFESTS } from '@/project/registry';

export const PROJECTS_TABLE = 'core_projects';
export const BASELINES_TABLE = 'core_baselines';

/** Schema Dexie gerado dos manifests: uma tabela por coleção. */
export function buildStores(manifests: Record<string, ModuleManifest>): Record<string, string> {
  const stores: Record<string, string> = {
    [PROJECTS_TABLE]: 'id',
    [BASELINES_TABLE]: 'id, projectId',
  };
  for (const m of Object.values(manifests))
    for (const c of m.collections) stores[c.table] = 'id, projectId';
  return stores;
}

export function createDb(name = 'pmb'): Dexie {
  const db = new Dexie(name);
  db.version(1).stores(STORES_V1);
  // v2 (Etapa 2): tabelas novas + migração das linhas existentes com a mesma função da importação.
  db.version(SCHEMA_VERSION)
    .stores(buildStores(MANIFESTS))
    .upgrade(async (tx) => {
      for (const table of Object.keys(STORES_V1)) {
        if (table === PROJECTS_TABLE || table === BASELINES_TABLE) continue;
        const rows = await tx.table(table).toArray();
        const migrated = migrateRows(table, rows, 1);
        if (migrated !== rows) await tx.table(table).bulkPut(migrated);
      }
      const projects = await tx.table(PROJECTS_TABLE).toArray();
      await tx.table(PROJECTS_TABLE).bulkPut(projects.map((p) => migrateProjectRow(p, 1)));
    });
  return db;
}
