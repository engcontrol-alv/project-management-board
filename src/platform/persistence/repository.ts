import type { Result } from '@/core/result';
import type { Command, CommandContext } from '@/commands/run';
import type { ProjectSnapshot } from '@/project/snapshot';

export type LoadResult =
  | { status: 'vazio' }
  | { status: 'pronto'; snapshot: ProjectSnapshot }
  | { status: 'corrompido'; raw: unknown; errors: string[] };

export interface ProjectRepository {
  /** Não abre nem cria o banco. */
  exists(): Promise<boolean>;
  loadSnapshot(): Promise<LoadResult>;
  commit(cmd: Command, ctx: CommandContext): Promise<Result<void, string[]>>;
  /** Importação/criação: limpa tudo e grava numa transação. */
  replaceAll(snapshot: ProjectSnapshot): Promise<void>;
  /** Recuperação: dump bruto das tabelas. */
  readRaw(): Promise<unknown>;
  clearAll(): Promise<void>;
}
