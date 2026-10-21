import { screen, waitFor, within } from '@testing-library/react';
import { DataMenu } from './DataMenu';
import { renderWithProject } from '@/test/render';

// Exportar e importar migraram para o cabeçalho: ver ProjectActions.test.tsx.
describe('DataMenu', () => {
  it('apagar dados locais exige APAGAR e volta à tela inicial', async () => {
    const onCleared = vi.fn();
    const { user, repo } = await renderWithProject(<DataMenu />, { onCleared });
    await user.click(await screen.findByRole('button', { name: 'Apagar dados locais' }));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: 'Confirmar' });
    expect(confirm).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Digite APAGAR para confirmar'), 'APAGAR');
    await user.click(confirm);
    await waitFor(() => expect(onCleared).toHaveBeenCalled());
    expect(await repo.exists()).toBe(false);
  });
});
