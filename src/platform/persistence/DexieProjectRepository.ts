import Dexie from 'dexie';
import { err, ok, type Result } from '@/core/result';
import { runCommand, type Command, type CommandContext } from '@/commands/run';
import { SCHEMA_VERSION } from '@/project/migrations';
import { ALL_COLLECTIONS } from '@/project/registry';
import { parseExport, toExport } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { BASELINES_TABLE, createDb, PROJECTS_TABLE } from './db';
import type { LoadResult, ProjectRepository } from './repository';

type Row = { id: string; projectId?: string } & Record<string, unknown>;

const SAVE_FAILED = 'Não foi possível salvar. Exporte seus dados.';

function strip({ projectId: _ignored, ...rest }: Row): Row {
  return rest as Row;
}

class RuleViolation extends Error {
  constructor(public readonly errors: string[]) {
    super(errors.join('\n'));
  }
}

export class DexieProjectRepository implements ProjectRepository {
  private db: Dexie;

  constructor(private readonly dbName = 'pmb') {
    // Dexie só abre (e cria) o banco na primeira operação.
    this.db = createDb(dbName);
  }

  async exists(): Promise<boolean> {
    if (typeof indexedDB === 'undefined') throw new Error('IndexedDB indisponível');
    if (typeof indexedDB.databases === 'function') {
      const dbs = await indexedDB.databases();
      return dbs.some((d) => d.name === this.dbName);
    }
    return Dexie.exists(this.dbName);
  }

  async readRaw(): Promise<unknown> {
    const projects = (await this.db.table(PROJECTS_TABLE).toArray()) as Row[];
    const baselines = (await this.db.table(BASELINES_TABLE).toArray()) as Row[];
    const data: Record<string, unknown[]> = {};
    for (const def of ALL_COLLECTIONS)
      data[def.table] = ((await this.db.table(def.table).toArray()) as Row[]).map(strip);
    // A versão vem do próprio projeto gravado, para que parseExport → migrateExport rode também na carga.
    const stored = projects[0]?.schemaVersion;
    return {
      format: 'pmb-export',
      schemaVersion: typeof stored === 'number' ? stored : SCHEMA_VERSION,
      exportedAt: '',
      project: projects[0],
      baselines,
      data,
    };
  }

  async loadSnapshot(): Promise<LoadResult> {
    const raw = (await this.readRaw()) as { project?: unknown };
    if (!raw.project) return { status: 'vazio' };
    const parsed = parseExport(raw);
    if (parsed.ok) return { status: 'pronto', snapshot: parsed.value };
    return { status: 'corrompido', raw, errors: parsed.error.message.split('\n') };
  }

  async commit(cmd: Command, ctx: CommandContext): Promise<Result<void, string[]>> {
    try {
      await this.db.transaction('rw', this.db.tables, async () => {
        const loaded = await this.loadSnapshot();
        if (loaded.status !== 'pronto')
          throw new RuleViolation(loaded.status === 'vazio' ? ['Nenhum projeto aberto.'] : loaded.errors);
        const run = runCommand(loaded.snapshot, cmd, ctx);
        if (!run.ok) throw new RuleViolation(run.error);
        const { changeset: cs, snapshot } = run.value;
        const projectId = snapshot.project.id;
        for (const { table, value } of cs.puts) await this.db.table(table).put({ ...value, projectId });
        for (const { table, id } of cs.deletes) await this.db.table(table).delete(id);
        if (cs.appendBaseline) await this.db.table(BASELINES_TABLE).add(cs.appendBaseline);
        if (cs.project) await this.db.table(PROJECTS_TABLE).put(cs.project);
      });
      return ok(undefined);
    } catch (e) {
      if (e instanceof RuleViolation) return err(e.errors);
      return err([SAVE_FAILED]);
    }
  }

  async replaceAll(s: ProjectSnapshot): Promise<void> {
    const file = toExport(s, '');
    await this.db.transaction('rw', this.db.tables, async () => {
      for (const t of this.db.tables) await t.clear();
      await this.db.table(PROJECTS_TABLE).put(s.project);
      await this.db.table(BASELINES_TABLE).bulkPut(s.baselines);
      for (const [table, rows] of Object.entries(file.data))
        await this.db.table(table).bulkPut((rows as Row[]).map((r) => ({ ...r, projectId: s.project.id })));
    });
  }

  async clearAll(): Promise<void> {
    await this.db.delete();
    this.db = createDb(this.dbName);
  }
}
