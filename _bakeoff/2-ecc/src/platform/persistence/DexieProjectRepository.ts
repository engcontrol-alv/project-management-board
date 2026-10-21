import Dexie from 'dexie';
import { err, ok, type Result } from '@/core/result';
import { runCommand, type Command, type CommandContext } from '@/commands/run';
import { SCHEMA_VERSION } from '@/project/migrations';
import { ALL_COLLECTIONS } from '@/project/registry';
import { parseExport, toExport } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { BASELINES_TABLE, PROJECTS_TABLE, createDb } from './db';
import type { LoadResult, ProjectRepository } from './repository';

const SAVE_FAILED = 'Não foi possível salvar. Exporte seus dados.';

class RuleError extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('\n'));
  }
}

function stripProjectId(row: Record<string, unknown>): Record<string, unknown> {
  const { projectId: _projectId, ...rest } = row;
  return rest;
}

export class DexieProjectRepository implements ProjectRepository {
  private db: Dexie | null = null;
  /** Evita `Dexie.exists()` (não-Dexie) nas releituras reativas depois que o banco já existe. */
  private knownToExist = false;

  constructor(private readonly dbName = 'pmb') {}

  /** Abre o banco sob demanda: nada é criado até a primeira gravação ou leitura com dados. */
  private open(): Dexie {
    if (!this.db) this.db = createDb(this.dbName);
    return this.db;
  }

  private tables(db: Dexie) {
    return [PROJECTS_TABLE, BASELINES_TABLE, ...ALL_COLLECTIONS.map((c) => c.table)].map((t) => db.table(t));
  }

  exists(): Promise<boolean> {
    return Dexie.exists(this.dbName);
  }

  async readRaw(): Promise<unknown> {
    const db = this.open();
    const projects = await db.table(PROJECTS_TABLE).toArray();
    const project = projects[0] as { schemaVersion?: number } | undefined;
    const data: Record<string, unknown[]> = {};
    for (const c of ALL_COLLECTIONS) data[c.table] = (await db.table(c.table).toArray()).map(stripProjectId);
    return {
      format: 'pmb-export',
      schemaVersion: project?.schemaVersion ?? SCHEMA_VERSION,
      project,
      baselines: await db.table(BASELINES_TABLE).toArray(),
      data,
    };
  }

  async loadSnapshot(): Promise<LoadResult> {
    if (!this.knownToExist) {
      if (!(await this.exists())) return { status: 'vazio' };
      this.knownToExist = true;
    }
    return this.loadFromDb();
  }

  /** Carga sem `exists()`: usável dentro de transação (só promessas Dexie). */
  private async loadFromDb(): Promise<LoadResult> {
    const raw = await this.readRaw();
    if (!(raw as { project?: unknown }).project) return { status: 'vazio' };
    const parsed = parseExport(raw);
    if (parsed.ok) return { status: 'pronto', snapshot: parsed.value };
    return { status: 'corrompido', raw, errors: parsed.error.message.split('\n') };
  }

  async commit(cmd: Command, ctx: CommandContext): Promise<Result<void, string[]>> {
    const db = this.open();
    try {
      await db.transaction('rw', this.tables(db), async () => {
        const loaded = await this.loadFromDb();
        if (loaded.status !== 'pronto') throw new RuleError(['Os dados locais não puderam ser carregados.']);
        const result = runCommand(loaded.snapshot, cmd, ctx);
        if (!result.ok) throw new RuleError(result.error);
        const { changeset } = result.value;
        const projectId = loaded.snapshot.project.id;
        for (const { table, value } of changeset.puts) await db.table(table).put({ ...value, projectId });
        for (const { table, id } of changeset.deletes) await db.table(table).delete(id);
        if (changeset.appendBaseline) await db.table(BASELINES_TABLE).add(changeset.appendBaseline);
        if (changeset.project) await db.table(PROJECTS_TABLE).put(changeset.project);
      });
      return ok(undefined);
    } catch (e) {
      if (e instanceof RuleError) return err(e.errors);
      return err([SAVE_FAILED]);
    }
  }

  async replaceAll(snapshot: ProjectSnapshot): Promise<void> {
    const db = this.open();
    const file = toExport(snapshot, snapshot.project.updatedAt);
    const projectId = snapshot.project.id;
    await db.transaction('rw', this.tables(db), async () => {
      for (const t of this.tables(db)) await t.clear();
      await db.table(PROJECTS_TABLE).put(file.project);
      await db.table(BASELINES_TABLE).bulkPut(file.baselines);
      for (const [table, rows] of Object.entries(file.data)) {
        await db.table(table).bulkPut(rows.map((r) => ({ ...(r as object), projectId })));
      }
    });
    this.knownToExist = true;
  }

  async clearAll(): Promise<void> {
    const db = this.open();
    this.db = null;
    this.knownToExist = false;
    await db.delete();
  }
}
