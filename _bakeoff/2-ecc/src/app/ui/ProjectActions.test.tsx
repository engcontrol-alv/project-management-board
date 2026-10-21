import { screen, waitFor, within } from '@testing-library/react';
import { ProjectActions } from './ProjectActions';
import { renderWithProject } from '@/test/render';
import { aProject, aSnapshot, NOW, person, pkg } from '@/test/builders';
import { toExport } from '@/project/serialization';
import { downloadText } from '@/shared/lib/download';

vi.mock('@/shared/lib/download', () => ({ downloadText: vi.fn() }));

const file = (text: string) => new File([text], 'p.json', { type: 'application/json' });

describe('ProjectActions (ações globais do cabeçalho)', () => {
  it('exporta com o nome padrão', async () => {
    const { user } = await renderWithProject(<ProjectActions />, { today: '2026-10-17' });
    await user.click(await screen.findByRole('button', { name: 'Exportar' }));
    expect(downloadText).toHaveBeenCalledWith('pmb-pt-01-2026-10-17.json', expect.stringContaining('"pmb-export"'));
  });

  it('importação válida mostra prévia e substitui após confirmar', async () => {
    const other = aSnapshot(aProject({ id: 'proj-2' as never, info: { name: 'Outro projeto', code: 'OP', startDate: '2026-01-05' } }))
      .parties(person('X'))
      .wbs(pkg('A', 1), pkg('B', 1))
      .build();
    const { user, snapshot } = await renderWithProject(<ProjectActions />);
    await user.upload(await screen.findByLabelText('Importar arquivo'), file(JSON.stringify(toExport(other, NOW))));
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('Outro projeto');
    expect(dialog).toHaveTextContent('EAP: 2');
    expect(dialog).toHaveTextContent('Substituir o projeto atual?');
    expect(dialog).toHaveTextContent('Exporte o projeto atual antes de substituir.');
    await user.click(within(dialog).getByRole('button', { name: 'Substituir' }));
    await waitFor(async () => expect((await snapshot()).project.info.name).toBe('Outro projeto'));
  });

  it('importação inválida mostra a mensagem e nada muda', async () => {
    const { user, snapshot } = await renderWithProject(<ProjectActions />);
    const before = await snapshot();
    await user.upload(await screen.findByLabelText('Importar arquivo'), file('não é json'));
    expect(await screen.findByRole('alert')).toHaveTextContent('O arquivo não é um JSON válido.');
    expect(await snapshot()).toEqual(before);
  });

  it('projeto de demonstração só substitui o atual após confirmar', async () => {
    const { user, snapshot } = await renderWithProject(<ProjectActions />);
    await user.click(await screen.findByRole('button', { name: 'Projeto Demo' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect((await snapshot()).project.info.name).toBe('Projeto Teste');
    await user.click(screen.getByRole('button', { name: 'Projeto Demo' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Substituir' }));
    await waitFor(async () => expect((await snapshot()).project.info.name).toBe('CEMS — Refinaria Atlântica'));
  });

  it('imprime em A4 pelo diálogo do navegador', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const { user } = await renderWithProject(<ProjectActions />);
    await user.click(await screen.findByRole('button', { name: 'Imprimir A4' }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it('atalho para Configurações', async () => {
    await renderWithProject(<ProjectActions />);
    expect(await screen.findByRole('link', { name: 'Configurações' })).toHaveAttribute('href', '/projeto/configuracao');
  });
});
