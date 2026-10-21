import { screen, waitFor, within } from '@testing-library/react';
import { WbsPage } from './WbsPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, group, pkg } from '@/test/builders';

const snapshot = () =>
  aSnapshot()
    .wbs(
      group('G', { code: '1', name: 'Engenharia' }),
      pkg('A', 5, [], { code: '1.1', name: 'Memorial', parentId: 'G' as never }),
      pkg('B', 3, ['A'], { code: '1.2', name: 'Desenhos', parentId: 'G' as never }),
    )
    .build();

const row = (code: string) => screen.getAllByText(code, { selector: 'td' })[0]!.closest('tr')!;

describe('WbsPage', () => {
  it('mostra datas calculadas de pacotes e agrupadores', async () => {
    await renderWithProject(<WbsPage />, { snapshot: snapshot() });
    await screen.findByText('Desenhos');
    expect(row('1.2').textContent).toContain('10/01/2026');
    expect(row('1.2').textContent).toContain('12/01/2026');
    expect(row('1').textContent).toContain('05/01/2026');
    expect(row('1').textContent).toContain('12/01/2026');
  });

  it('formulário não tem datas planejadas e predecessores só listam pacotes', async () => {
    const { user } = await renderWithProject(<WbsPage />, { snapshot: snapshot() });
    await user.click(await screen.findByRole('button', { name: 'Novo' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText(/planejad/i)).toBeNull();
    const preds = within(dialog).getByRole('group', { name: 'Predecessores' });
    expect(within(preds).getByLabelText('1.1 Memorial')).toBeInTheDocument();
    expect(within(preds).queryByLabelText('1 Engenharia')).toBeNull();
  });

  it('predecessor que forma ciclo mostra a mensagem e não salva', async () => {
    const { user, snapshot: load } = await renderWithProject(<WbsPage />, { snapshot: snapshot() });
    await user.click(await screen.findByRole('button', { name: 'Editar 1.1' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(within(dialog).getByRole('group', { name: 'Predecessores' })).getByLabelText('1.2 Desenhos'));
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('dependência circular');
    await waitFor(async () => expect((await load()).scope.wbs['A' as never]?.predecessorIds).toEqual([]));
  });
});
