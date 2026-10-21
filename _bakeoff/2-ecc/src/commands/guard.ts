import { err } from '@/core/result';
import { isReadOnly } from '@/modules/governance';
import type { Command } from './run';

/** Projeto encerrado recusa qualquer escrita, exceto comandos marcados com `allowWhenClosed`. */
export function guard(cmd: Command, opts: { allowWhenClosed?: boolean } = {}): Command {
  return (s, ctx) => {
    if (!opts.allowWhenClosed && isReadOnly(s.governance.profile)) return err(['Projeto encerrado: somente leitura.']);
    return cmd(s, ctx);
  };
}
