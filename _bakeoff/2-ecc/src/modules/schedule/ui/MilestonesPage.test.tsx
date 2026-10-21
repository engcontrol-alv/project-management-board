import { screen, within } from '@testing-library/react';
import { MilestonesPage } from './MilestonesPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, milestone, pkg } from '@/test/builders';

const snapshot = () =>
  aSnapshot()
    .wbs(pkg('A', 5, [], { code: '1' }), pkg('C', 2, [], { code: '2' }))
    .milestones(milestone('M', ['A'], { code: 'M-001', name: 'Entrega do painel' }), milestone('N', ['C'], { code: 'M-002' }))
    .build();

describe('MilestonesPage', () => {
  it('crítico e previsão são derivados', async () => {
    await renderWithProject(<MilestonesPage />, { snapshot: snapshot() });
    const row = (await screen.findByText('Entrega do painel')).closest('tr')!;
    expect(within(row).getByText('Crítico')).toBeInTheDocument();
    expect(row.textContent).toContain('09/01/2026');
    const other = screen.getByText('M-002').closest('tr')!;
    expect(within(other).queryByText('Crítico')).toBeNull();
  });

  it('formulário sem campo de crítico; data manual só sem predecessores', async () => {
    const { user } = await renderWithProject(<MilestonesPage />, { snapshot: snapshot() });
    await user.click(await screen.findByRole('button', { name: 'Editar M-001' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).queryByLabelText(/Crítico/i)).toBeNull();
    expect(within(dialog).queryByLabelText('Data manual')).toBeNull();
    await user.click(within(within(dialog).getByRole('group', { name: 'Predecessores' })).getByLabelText('1 Pacote A'));
    expect(within(dialog).getByLabelText('Data manual')).toBeInTheDocument();
  });
});
