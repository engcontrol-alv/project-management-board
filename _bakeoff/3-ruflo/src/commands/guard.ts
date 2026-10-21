import { err } from '@/core/result';
import { isReadOnly } from '@/modules/governance';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { Command } from './run';

/** Projeto encerrado = aplicação somente leitura. */
export function isClosed(s: ProjectSnapshot): boolean {
  return isReadOnly(s.governance.profile);
}

/** Projeto `Encerrado` recusa qualquer escrita, exceto as marcadas com `allowWhenClosed`. */
export function guard(cmd: Command, opts: { allowWhenClosed?: boolean } = {}): Command {
  return (s, ctx) =>
    isClosed(s) && !opts.allowWhenClosed
      ? err(['Projeto encerrado: somente leitura.'])
      : cmd(s, ctx);
}
