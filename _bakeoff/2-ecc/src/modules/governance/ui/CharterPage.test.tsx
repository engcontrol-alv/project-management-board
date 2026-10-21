import { screen, waitFor, within } from '@testing-library/react';
import { CharterPage } from './CharterPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, lesson, org, person } from '@/test/builders';

describe('CharterPage', () => {
  it('lições registradas é derivado e somente leitura', async () => {
    await renderWithProject(<CharterPage />, { snapshot: aSnapshot().build() });
    expect(await screen.findByTestId('lessons-registered')).toHaveTextContent('Não');
  });

  it('com lição registrada mostra Sim', async () => {
    const s = aSnapshot().with((s) => (s.governance.lessons['L' as never] = lesson('L'))).build();
    await renderWithProject(<CharterPage />, { snapshot: s });
    expect(await screen.findByTestId('lessons-registered')).toHaveTextContent('Sim');
  });

  it('salva ficha e informações do projeto; cliente só lista organizações Cliente', async () => {
    const s = aSnapshot().parties(person('P', { name: 'Ana' }), org('C', ['Cliente']), org('F', ['Fornecedor'])).build();
    const { user, snapshot } = await renderWithProject(<CharterPage />, { snapshot: s });
    const name = await screen.findByLabelText('Nome do projeto');
    await user.clear(name);
    await user.type(name, 'Projeto Renomeado');
    const client = screen.getByLabelText('Cliente');
    const options = within(client).getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('PI-C Org C');
    expect(options).not.toContain('PI-F Org F');
    await user.selectOptions(client, 'C');
    await user.selectOptions(screen.getByLabelText('Gerente'), 'P');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => {
      const after = await snapshot();
      expect(after.project.info.name).toBe('Projeto Renomeado');
      expect(after.governance.profile.charter).toMatchObject({ clientId: 'C', managerId: 'P' });
    });
  });

  it('Encerrado sem termo assinado mostra o erro', async () => {
    const { user } = await renderWithProject(<CharterPage />, { snapshot: aSnapshot().build() });
    await user.selectOptions(await screen.findByLabelText('Status'), 'Encerrado');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Encerrado exige termo de encerramento assinado');
  });

  it('projeto encerrado: somente leitura e "Reabrir projeto"', async () => {
    const s = aSnapshot()
      .with((s) => {
        s.governance.profile.charter.status = 'Encerrado';
        s.governance.profile.closure = { plannedDate: null, actualDate: '2026-01-05', pendingItems: '', closureTermSigned: true };
      })
      .build();
    const { user, snapshot } = await renderWithProject(<CharterPage />, { snapshot: s });
    expect(await screen.findByLabelText('Nome do projeto')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reabrir projeto' }));
    await waitFor(async () => expect((await snapshot()).governance.profile.charter.status).toBe('Em execução'));
    expect(await screen.findByRole('button', { name: 'Salvar' })).toBeInTheDocument();
  });
});
