import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type { IsoDate } from '@/shared/lib/dates';
import { buildContext } from '@/analytics/dashboard';
import type { AnalysisContext } from '@/analytics/alerts/types';
import { effectiveStatusDate } from '@/analytics/derive';
import type { LoadResult, ProjectRepository } from '../persistence/repository';

export type Clock = { now(): string; today(): IsoDate };

type Ctx = {
  repository: ProjectRepository;
  clock: Clock;
  load: LoadResult | undefined;
  analysis: AnalysisContext | undefined;
};

const RepositoryContext = createContext<Ctx | null>(null);

/**
 * Disponibiliza o repositório, uma única leitura reativa do projeto (reexecutada quando
 * qualquer tabela muda, inclusive em outra aba) e as projeções derivadas.
 * Só deve ser montado quando o banco já existe — consultar cria o banco.
 */
export function RepositoryProvider({
  repository,
  clock,
  children,
}: {
  repository: ProjectRepository;
  clock: Clock;
  children: ReactNode;
}) {
  const load = useLiveQuery(() => repository.loadSnapshot(), [repository]);
  const snapshot = load?.status === 'pronto' ? load.snapshot : undefined;
  // "Hoje" é relido a cada renderização: a virada do dia vale na próxima interação.
  const statusDate = snapshot ? effectiveStatusDate(snapshot.project, clock.today()) : null;
  const analysis = useMemo(
    () => (snapshot && statusDate ? buildContext(snapshot, statusDate) : undefined),
    [snapshot, statusDate],
  );
  return (
    <RepositoryContext.Provider value={{ repository, clock, load, analysis }}>
      {children}
    </RepositoryContext.Provider>
  );
}

export function useRepositoryContext(): Ctx {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('RepositoryProvider ausente');
  return ctx;
}
