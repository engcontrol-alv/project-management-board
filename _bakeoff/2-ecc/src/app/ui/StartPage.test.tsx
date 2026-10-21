import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../App';
import { DexieProjectRepository } from '@/platform/persistence/DexieProjectRepository';
import { toExport } from '@/project/serialization';
import { testClock } from '@/test/render';
import { aSnapshot, NOW, person } from '@/test/builders';

let n = 0;
const newRepo = () => new DexieProjectRepository(`start-${Date.now()}-${++n}`);
const jsonFile = (content: string) => new File([content], 'projeto.json', { type: 'application/json' });

beforeEach(() => {
  window.location.hash = '';
});

describe('StartPage', () => {
  it('cria o projeto e vai para o painel', async () => {
    const repo = newRepo();
    const spy = vi.spyOn(repo, 'replaceAll');
    const user = userEvent.setup();
    render(<App repository={repo} clock={testClock()} />);
    await user.type(await screen.findByLabelText('Nome do projeto'), 'Subestação Norte');
    await user.type(screen.getByLabelText('Código (até 12 caracteres)'), 'SE-N');
    await user.type(screen.getByLabelText('Data de início'), '2026-01-05');
    await user.click(screen.getByRole('button', { name: 'Criar projeto' }));
    expect(await screen.findByText('Subestação Norte')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledOnce();
    expect(window.location.hash).toBe('#/projeto/governance/painel');
  });

  it('dados inválidos não criam nada', async () => {
    const repo = newRepo();
    const spy = vi.spyOn(repo, 'replaceAll');
    const user = userEvent.setup();
    render(<App repository={repo} clock={testClock()} />);
    await user.click(await screen.findByRole('button', { name: 'Criar projeto' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
    expect(await repo.exists()).toBe(false);
  });

  it('importa arquivo válido', async () => {
    const repo = newRepo();
    const spy = vi.spyOn(repo, 'replaceAll');
    const user = userEvent.setup();
    const s = aSnapshot().parties(person('P')).build();
    render(<App repository={repo} clock={testClock()} />);
    await user.upload(await screen.findByLabelText('Importar projeto'), jsonFile(JSON.stringify(toExport(s, NOW))));
    expect(await screen.findByText('Projeto Teste')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledWith(s);
  });

  it('carrega o projeto de demonstração já preenchido', async () => {
    const repo = newRepo();
    const spy = vi.spyOn(repo, 'replaceAll');
    const user = userEvent.setup();
    render(<App repository={repo} clock={testClock()} />);
    await user.click(await screen.findByRole('button', { name: 'Carregar Projeto de Demonstração' }));
    expect(await screen.findByText('CEMS — Refinaria Atlântica')).toBeInTheDocument();
    expect(spy).toHaveBeenCalledOnce();
    expect(Object.keys(spy.mock.calls[0]![0].scope.wbs).length).toBeGreaterThan(0);
    expect(window.location.hash).toBe('#/projeto/governance/painel');
  });

  it('arquivo inválido mostra a mensagem e não grava', async () => {
    const repo = newRepo();
    const spy = vi.spyOn(repo, 'replaceAll');
    const user = userEvent.setup();
    render(<App repository={repo} clock={testClock()} />);
    await user.upload(await screen.findByLabelText('Importar projeto'), jsonFile('{"x":1}'));
    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo não é uma exportação do Project Management Board.');
    expect(spy).not.toHaveBeenCalled();
  });
});
