import { createContext, useContext } from 'react';
import type { ProjectSnapshot } from '@/project/snapshot';

/** Ações do nível da aplicação que trocam o estado de abertura (importar, apagar). */
export type AppActions = {
  replaceProject(s: ProjectSnapshot): Promise<void>;
  clearAll(): Promise<void>;
};

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error('AppActionsContext ausente');
  return ctx;
}
