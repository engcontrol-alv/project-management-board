import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { IsoDate } from '@/shared/lib/dates';
import type { ProjectRepository } from '../persistence/repository';

export type Clock = { now(): string; today(): IsoDate };

type RepositoryContextValue = {
  repository: ProjectRepository;
  clock: Clock;
  /** Chamado depois de "Apagar dados locais" para voltar à tela inicial. */
  onCleared?: () => void;
};

const RepositoryContext = createContext<RepositoryContextValue | null>(null);

export function RepositoryProvider({
  repository,
  clock,
  onCleared,
  children,
}: RepositoryContextValue & { children: ReactNode }) {
  const value = useMemo(() => ({ repository, clock, onCleared }), [repository, clock, onCleared]);
  return <RepositoryContext.Provider value={value}>{children}</RepositoryContext.Provider>;
}

export function useRepository(): RepositoryContextValue {
  const ctx = useContext(RepositoryContext);
  if (!ctx) throw new Error('RepositoryProvider ausente');
  return ctx;
}
