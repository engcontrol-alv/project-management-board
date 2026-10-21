import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import type { ProjectRepository } from '@/platform/persistence/repository';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import { testClock } from '@/test/render';
import { aSnapshot } from '@/test/builders';

function fakeRepo(over: Partial<ProjectRepository>): ProjectRepository {
  return {
    exists: vi.fn(async () => false),
    loadSnapshot: vi.fn(async () => ({ status: 'vazio' as const })),
    commit: vi.fn(),
    replaceAll: vi.fn(async () => {}),
    readRaw: vi.fn(async () => ({})),
    clearAll: vi.fn(async () => {}),
    ...over,
  };
}

let n = 0;
beforeEach(() => {
  window.location.hash = '';
});

describe('App — estados de abertura', () => {
  it('navegador limpo: tela inicial sem carregar dados', async () => {
    const repo = fakeRepo({});
    render(<App repository={repo} clock={testClock()} />);
    expect(await screen.findByRole('button', { name: 'Criar projeto' })).toBeInTheDocument();
    expect(screen.getByLabelText('Importar projeto')).toBeInTheDocument();
    expect(screen.getByText('Project Management Board')).toBeInTheDocument();
    expect(repo.loadSnapshot).not.toHaveBeenCalled();
  });

  it('IndexedDB indisponível', async () => {
    const repo = fakeRepo({ exists: vi.fn(async () => Promise.reject(new Error('blocked'))) });
    render(<App repository={repo} clock={testClock()} />);
    expect(
      await screen.findByText('Este navegador não permite salvar dados. Use uma janela normal ou outro navegador.'),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Importar projeto')).toBeNull();
  });

  it('dados corrompidos: recuperação', async () => {
    const repo = fakeRepo({
      exists: vi.fn(async () => true),
      loadSnapshot: vi.fn(async () => ({ status: 'corrompido' as const, raw: { a: 1 }, errors: ['EAP #1: duração inválida'] })),
    });
    const user = userEvent.setup();
    render(<App repository={repo} clock={testClock()} />);
    expect(await screen.findByText('EAP #1: duração inválida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar dados brutos' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Apagar dados locais' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Digite APAGAR para confirmar'), 'APAGAR');
    await user.click(within(dialog).getByRole('button', { name: 'Confirmar' }));
    expect(repo.clearAll).toHaveBeenCalled();
    expect(await screen.findByRole('button', { name: 'Criar projeto' })).toBeInTheDocument();
  });

  it('projeto existente abre o painel', async () => {
    const repo = new DexieProjectRepository(`app-${++n}`);
    await repo.replaceAll(aSnapshot().build());
    render(<App repository={repo} clock={testClock()} />);
    expect(await screen.findByText('Projeto Teste')).toBeInTheDocument();
    expect(window.location.hash).toBe('#/projeto/governance/painel');
    expect(screen.getByText('Seus dados ficam apenas neste navegador. Exporte regularmente.')).toBeInTheDocument();
  });
});
