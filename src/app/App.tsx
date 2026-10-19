import { useCallback, useEffect, useMemo, useState } from 'react';
import { HashRouter, useRoutes } from 'react-router-dom';
import { newId } from '@/shared/lib/ids';
import { newProjectSnapshot } from '@/commands/project';
import type { ProjectRepository } from '@/platform/persistence/repository';
import { RepositoryProvider, type Clock } from '@/platform/react/hooks';
import type { ProjectInfo } from '@/project/project';
import type { ProjectSnapshot } from '@/project/snapshot';
import { buildDemoSnapshot } from './demo/demo-project';
import { buildRoutes } from './routes';
import { AppActionsContext, type AppActions } from './shell';
import { RecoveryPage } from './ui/RecoveryPage';
import { StartPage } from './ui/StartPage';
import { UnsupportedPage } from './ui/UnsupportedPage';

const ROUTES = buildRoutes();

function AppRoutes() {
  return useRoutes(ROUTES);
}

export type AppState = 'verificando' | 'sem-projeto' | 'pronto' | 'corrompido' | 'indisponivel';

export function App({ repository, clock }: { repository: ProjectRepository; clock: Clock }) {
  const [state, setState] = useState<AppState>('verificando');
  const [corrupt, setCorrupt] = useState<{ raw: unknown; errors: string[] }>({ raw: null, errors: [] });

  const check = useCallback(async () => {
    try {
      // Sem banco: não consultar nada (abrir o banco o criaria).
      if (!(await repository.exists())) return setState('sem-projeto');
      const r = await repository.loadSnapshot();
      if (r.status === 'pronto') setState('pronto');
      else if (r.status === 'corrompido') {
        setCorrupt({ raw: r.raw, errors: r.errors });
        setState('corrompido');
      } else setState('sem-projeto');
    } catch {
      setState('indisponivel');
    }
  }, [repository]);

  useEffect(() => {
    void check();
  }, [check]);

  const actions: AppActions = useMemo(
    () => ({
      replaceProject: async (s: ProjectSnapshot) => {
        try {
          await repository.replaceAll(s);
          window.location.hash = '#/projeto/governance/painel'; // projeto novo/importado abre no painel
          setState('pronto');
        } catch {
          setState('indisponivel');
        }
      },
      clearAll: async () => {
        setState('verificando'); // desmonta as consultas antes de apagar o banco
        await repository.clearAll();
        setState('sem-projeto');
      },
    }),
    [repository],
  );

  if (state === 'verificando') return <p className="start muted">Carregando…</p>;
  if (state === 'indisponivel') return <UnsupportedPage />;
  if (state === 'corrompido')
    return <RecoveryPage errors={corrupt.errors} raw={corrupt.raw} today={clock.today()} onClear={() => void actions.clearAll()} />;
  if (state === 'sem-projeto')
    return (
      <StartPage
        today={clock.today()}
        onCreate={(info: ProjectInfo) =>
          actions.replaceProject(newProjectSnapshot(info, { now: clock.now(), today: clock.today(), newId }))
        }
        onImport={actions.replaceProject}
        onLoadDemo={() => actions.replaceProject(buildDemoSnapshot({ now: clock.now(), today: clock.today(), newId }))}
      />
    );
  return (
    <AppActionsContext.Provider value={actions}>
      <RepositoryProvider repository={repository} clock={clock}>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
      </RepositoryProvider>
    </AppActionsContext.Provider>
  );
}
