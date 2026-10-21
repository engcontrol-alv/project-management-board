import { useCallback } from 'react';
import type { Result } from '@/core/result';
import { newId } from '@/shared/lib/ids';
import type { AnalysisContext } from '@/analytics/alerts/types';
import type { DerivedProject } from '@/analytics/derive';
import type { Command } from '@/commands/run';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { LoadResult } from '../persistence/repository';
import { useRepositoryContext } from './RepositoryProvider';

export { RepositoryProvider, useRepositoryContext, type Clock } from './RepositoryProvider';

export function useLoadResult(): LoadResult | undefined {
  return useRepositoryContext().load;
}

export function useSnapshot(): ProjectSnapshot | undefined {
  return useRepositoryContext().analysis?.snapshot;
}

export function useAnalysis(): AnalysisContext | undefined {
  return useRepositoryContext().analysis;
}

export function useDerived(): DerivedProject | undefined {
  return useAnalysis()?.derived;
}

export function useCommand(): (cmd: Command) => Promise<Result<void, string[]>> {
  const { repository, clock } = useRepositoryContext();
  return useCallback(
    (cmd: Command) => repository.commit(cmd, { now: clock.now(), today: clock.today(), newId }),
    [repository, clock],
  );
}
