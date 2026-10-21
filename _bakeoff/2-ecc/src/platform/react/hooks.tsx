import { useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { Result } from '@/core/result';
import { newId } from '@/shared/lib/ids';
import { isReadOnly } from '@/modules/governance';
import type { ProjectSnapshot } from '@/project/snapshot';
import { resolveConfig, type ResolvedConfig } from '@/project/config';
import { analysisContext, type AnalysisContext } from '@/analytics/context';
import { effectiveStatusDate, type DerivedProject } from '@/analytics/derive';
import type { Command } from '@/commands/run';
import { useRepository } from './RepositoryProvider';

/** Snapshot reativo: Dexie relê quando qualquer tabela observada muda (inclusive em outra aba). */
export function useSnapshot(): ProjectSnapshot | undefined {
  const { repository } = useRepository();
  const result = useLiveQuery(async () => {
    const r = await repository.loadSnapshot();
    return r.status === 'pronto' ? r.snapshot : null;
  }, [repository]);
  return result ?? undefined;
}

export function useAnalysis(): AnalysisContext | undefined {
  const snapshot = useSnapshot();
  const { clock } = useRepository();
  const today = clock.today();
  return useMemo(
    () => (snapshot ? analysisContext(snapshot, effectiveStatusDate(snapshot.project, today)) : undefined),
    [snapshot, today],
  );
}

export function useDerived(): DerivedProject | undefined {
  return useAnalysis()?.derived;
}

export function useReadOnly(): boolean {
  const snapshot = useSnapshot();
  return snapshot ? isReadOnly(snapshot.governance.profile) : false;
}

export function useCommand(): (cmd: Command) => Promise<Result<void, string[]>> {
  const { repository, clock } = useRepository();
  return useCallback(
    (cmd: Command) => repository.commit(cmd, { now: clock.now(), today: clock.today(), newId }),
    [repository, clock],
  );
}

export function useConfig(): ResolvedConfig | undefined {
  const snapshot = useSnapshot();
  return useMemo(() => (snapshot ? resolveConfig(snapshot.project.config) : undefined), [snapshot]);
}
