import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aSnapshot } from '@/test/builders';
import { testClock } from '@/test/render';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import type { ProjectRepository } from '@/platform/persistence/repository';
import { toExport } from '@/project/serialization';
import { App } from './App';

function fakeRepo(o: Partial<ProjectRepository> = {}): ProjectRepository {
  return {
    exists: vi.fn(async () => false),
    loadSnapshot: vi.fn(async () => ({ status: 'vazio' as const })),
    commit: vi.fn(async () => ({ ok: true as const, value: undefined })),
    replaceAll: vi.fn(async () => {}),
    readRaw: vi.fn(async () => ({})),
    clearAll: vi.fn(async () => {}),
    ...o,
  };
}

let n = 0;
const fileOf = (text: string) => new File([text], 'projeto.json', { type: 'application/json' });

beforeEach(() => {
  window.location.hash = '';
});

describe('App — estados de abertura', () => {
  it('navegador limpo: tela inicial sem consultar o banco', async () => {
    const repo = fakeRepo();
    render(<App repository={repo} clock={testClock} />);
    expect(await screen.findByRole('button', { name: /Criar projeto/ })).toBeInTheDocument();
    expect(screen.getByText('Importar projeto')).toBeInTheDocument();
    expect(screen.getByText('Project Management Board')).toBeInTheDocument();
    expect(repo.loadSnapshot).not.toHaveBeenCalled();
  });

  it('Review Focus 1: IndexedDB indisponível', async () => {
    const repo = fakeRepo({ exists: vi.fn(async () => Promise.reject(new Error('blocked'))) });
    render(<App repository={repo} clock={testClock} />);
    expect(
      await screen.findByText('Este navegador não permite salvar dados. Use uma janela normal ou outro navegador.'),
    ).toBeInTheDocument();
  });

  it('dados corrompidos: tela de recuperação', async () => {
    const repo = fakeRepo({
      exists: vi.fn(async () => true),
      loadSnapshot: vi.fn(async () => ({ status: 'corrompido' as const, raw: { x: 1 }, errors: ['EAP #1: nome é obrigatório'] })),
    });
    render(<App repository={repo} clock={testClock} />);
    expect(await screen.findByText('EAP #1: nome é obrigatório')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Exportar dados brutos' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apagar dados locais' })).toBeInTheDocument();
  });
});

describe('Novo Projeto (cabeçalho)', () => {
  async function openProject() {
    const repo = new DexieProjectRepository(`app-test-${++n}-${Date.now()}`);
    await repo.replaceAll(aSnapshot().build());
    render(<App repository={repo} clock={testClock} />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo Projeto/ }));
    return { repo, dialog: await screen.findByRole('dialog', { name: 'Começar um novo projeto?' }) };
  }

  it('confirma sem digitar palavra, apaga o projeto atual e volta à tela inicial', async () => {
    const { repo, dialog } = await openProject();
    expect(dialog).toHaveTextContent('Exporte o projeto atual antes se quiser guardá-lo.');
    expect(within(dialog).getByRole('button', { name: 'Exportar o atual' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Apagar e começar novo' }));
    expect(await screen.findByRole('button', { name: /Criar projeto/ })).toBeInTheDocument();
    expect(await repo.exists()).toBe(false);
    expect(window.location.hash).toBe('#/');
  });

  it('cancelar mantém o projeto aberto', async () => {
    const { repo, dialog } = await openProject();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Painel executivo')).toBeInTheDocument();
    expect(await repo.exists()).toBe(true);
  });
});

describe('StartPage', () => {
  it('logotipo vetorial, sem a sigla PMB (PMBOK no texto é outro termo)', async () => {
    const repo = new DexieProjectRepository(`app-test-${++n}-${Date.now()}`);
    const { container } = render(<App repository={repo} clock={testClock} />);
    await screen.findByLabelText('Nome');
    expect(container.querySelector('.brand-mark svg.brand-emblem')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(new RegExp('\\bPMB\\b'));
  });

  it('criar projeto grava e abre o painel', async () => {
    const repo = new DexieProjectRepository(`app-test-${++n}-${Date.now()}`);
    const spy = vi.spyOn(repo, 'replaceAll');
    render(<App repository={repo} clock={testClock} />);
    await userEvent.type(await screen.findByLabelText('Nome'), 'Subestação Norte');
    await userEvent.type(screen.getByLabelText('Código'), 'SE-N');
    await userEvent.click(screen.getByRole('button', { name: /Criar projeto/ }));
    await waitFor(() => expect(spy).toHaveBeenCalledOnce());
    expect(await screen.findByText('Painel executivo')).toBeInTheDocument();
    expect(screen.getByText('Subestação Norte')).toBeInTheDocument();
    expect(screen.getByText('Seus dados ficam apenas neste navegador. Exporte regularmente.')).toBeInTheDocument();
  });

  it('importar arquivo válido grava o snapshot importado', async () => {
    const repo = fakeRepo();
    const s = aSnapshot().build();
    render(<App repository={repo} clock={testClock} />);
    const input = (await screen.findByLabelText(/Importar projeto/)) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf(JSON.stringify(toExport(s, 'now')))] } });
    await waitFor(() => expect(repo.replaceAll).toHaveBeenCalledWith(s));
  });

  it('projeto de demonstração só é gravado por ação explícita', async () => {
    const repo = fakeRepo();
    render(<App repository={repo} clock={testClock} />);
    await screen.findByRole('button', { name: /Criar projeto/ });
    expect(repo.replaceAll).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Carregar projeto de demonstração/ }));
    await waitFor(() => expect(repo.replaceAll).toHaveBeenCalledOnce());
    const [s] = vi.mocked(repo.replaceAll).mock.calls[0]!;
    expect(s.project.info.name).toMatch(/^Demonstração/);
  });

  it('importar arquivo inválido mostra a mensagem e não grava', async () => {
    const repo = fakeRepo();
    render(<App repository={repo} clock={testClock} />);
    const input = (await screen.findByLabelText(/Importar projeto/)) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [fileOf('{"x":1}')] } });
    expect(await screen.findByText('O arquivo não é uma exportação do Project Management Board.')).toBeInTheDocument();
    expect(repo.replaceAll).not.toHaveBeenCalled();
  });
});
