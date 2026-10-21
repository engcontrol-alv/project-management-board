import { useCallback, useEffect, useState } from 'react';
import { HashRouter } from 'react-router-dom';
import { LayoutGrid } from 'lucide-react';
import type { ProjectRepository } from '@/platform/persistence/repository';
import { RepositoryProvider, type Clock } from '@/platform/react/RepositoryProvider';
import { StartPage } from './ui/StartPage';
import { RecoveryPage } from './ui/RecoveryPage';
import { UnsupportedPage } from './ui/UnsupportedPage';
import { AppRoutes } from './routes';

export type AppState =
  | { kind: 'verificando' }
  | { kind: 'sem-projeto' }
  | { kind: 'pronto' }
  | { kind: 'corrompido'; raw: unknown; errors: string[] }
  | { kind: 'indisponivel' };

function ProjectApp({ repository, clock, onCleared }: { repository: ProjectRepository; clock: Clock; onCleared: () => void }) {
  return (
    <RepositoryProvider repository={repository} clock={clock} onCleared={onCleared}>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </RepositoryProvider>
  );
}

export function App({ repository, clock }: { repository: ProjectRepository; clock: Clock }) {
  const [state, setState] = useState<AppState>({ kind: 'verificando' });

  const check = useCallback(async () => {
    try {
      // Navegador limpo: `exists()` não cria o banco e nenhuma consulta é instanciada.
      if (!(await repository.exists())) return setState({ kind: 'sem-projeto' });
      const loaded = await repository.loadSnapshot();
      if (loaded.status === 'pronto') return setState({ kind: 'pronto' });
      if (loaded.status === 'corrompido') return setState({ kind: 'corrompido', raw: loaded.raw, errors: loaded.errors });
      setState({ kind: 'sem-projeto' });
    } catch {
      setState({ kind: 'indisponivel' });
    }
  }, [repository]);

  useEffect(() => {
    void check();
  }, [check]);

  const cleared = useCallback(() => {
    window.location.hash = '#/';
    setState({ kind: 'sem-projeto' });
  }, []);

  return (
    <>
      {state.kind !== 'pronto' && (
        <header className="tb-header no-print">
          <span className="tb-brand-mark" aria-hidden="true">
            <LayoutGrid size={15} />
          </span>
          <h1>Project Management Board</h1>
        </header>
      )}
      {state.kind === 'verificando' && <p className="tb-main tb-hint">Abrindo…</p>}
      {state.kind === 'indisponivel' && <UnsupportedPage />}
      {state.kind === 'sem-projeto' && (
        <StartPage
          repository={repository}
          clock={clock}
          onReady={() => {
            window.location.hash = '#/';
            setState({ kind: 'pronto' });
          }}
        />
      )}
      {state.kind === 'corrompido' && (
        <RecoveryPage
          raw={state.raw}
          errors={state.errors}
          today={clock.today()}
          onClear={async () => {
            await repository.clearAll();
            cleared();
          }}
        />
      )}
      {state.kind === 'pronto' && <ProjectApp repository={repository} clock={clock} onCleared={cleared} />}
    </>
  );
}
