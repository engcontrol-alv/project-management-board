import Dexie, { type Transaction } from 'dexie';
import type { ModuleManifest } from '@/core/module-contract';
import { migrateProjectRow, migrateRows, STORES_V1, STORES_V2, STORES_V3, TABLE_RENAMES } from '@/project/migrations';
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
  // Cada versão migra as linhas existentes com a mesma função da importação (ARCHITECTURE §6.5).
  const upgradeFrom = (from: number, tables: Record<string, string>) => async (tx: Transaction) => {
    for (const table of Object.keys(tables)) {
      if (table === PROJECTS_TABLE || table === BASELINES_TABLE) continue;
      const rows = await tx.table(table).toArray();
      const migrated = migrateRows(table, rows, from, from + 1);
      if (migrated !== rows) await tx.table(table).bulkPut(migrated);
    }
    const projects = await tx.table(PROJECTS_TABLE).toArray();
    await tx.table(PROJECTS_TABLE).bulkPut(projects.map((p: unknown) => migrateProjectRow(p, from)));
  };
  // v2 (Etapa 2): tabelas novas.
  db.version(2).stores(STORES_V2).upgrade(upgradeFrom(1, STORES_V1));
  // v3 (Etapa 3): sem tabelas novas; riscos, entregáveis e perfil ganham campos.
  db.version(3).stores(STORES_V3).upgrade(upgradeFrom(2, STORES_V2));
  // v4: mudanças saem do Escopo para a Governança — copia as linhas para a tabela nova e apaga a antiga.
  const removed = Object.fromEntries(Object.keys(TABLE_RENAMES[3]!).map((t) => [t, null]));
  db.version(4)
    .stores({ ...buildStores(MANIFESTS), ...removed })
    .upgrade(async (tx) => {
      await upgradeFrom(3, STORES_V3)(tx);
      for (const [from, to] of Object.entries(TABLE_RENAMES[3]!)) await tx.table(to).bulkPut(await tx.table(from).toArray());
    });
  return db;
}
