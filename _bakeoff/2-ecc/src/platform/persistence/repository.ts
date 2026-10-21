import type { Result } from '@/core/result';
import type { Command, CommandContext } from '@/commands/run';
import type { ProjectSnapshot } from '@/project/snapshot';

export type LoadResult =
  | { status: 'vazio' }
  | { status: 'pronto'; snapshot: ProjectSnapshot }
  | { status: 'corrompido'; raw: unknown; errors: string[] };

/** Porta de persistência; trocar Dexie por HTTP mantém esta interface. */
export interface ProjectRepository {
  /** Não abre nem cria o banco. */
  exists(): Promise<boolean>;
  loadSnapshot(): Promise<LoadResult>;
  commit(cmd: Command, ctx: CommandContext): Promise<Result<void, string[]>>;
  replaceAll(snapshot: ProjectSnapshot): Promise<void>;
  readRaw(): Promise<unknown>;
  clearAll(): Promise<void>;
}
