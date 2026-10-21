import { screen, waitFor } from '@testing-library/react';
import { DocsProcurementPage } from './DocsProcurementPage';
import { renderWithProject } from '@/test/render';

describe('DocsProcurementPage', () => {
  it('grava o template de documentação', async () => {
    const { user, snapshot } = await renderWithProject(<DocsProcurementPage />);
    await user.selectOptions(await screen.findByLabelText('Template de documentação'), 'Externo (cliente)');
    await user.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () =>
      expect((await snapshot()).governance.profile.documentTemplate.template).toBe('Externo (cliente)'),
    );
    // A confirmação sobrevive à releitura reativa do snapshot (o formulário não é remontado).
    expect(await screen.findByText('Salvo.')).toBeInTheDocument();
  });

  it('faturamento direto ao cliente mostra a nota', async () => {
    const { user } = await renderWithProject(<DocsProcurementPage />);
    expect(screen.queryByText('Contratações deste projeto não compõem receita própria.')).toBeNull();
    await user.selectOptions(await screen.findByLabelText('Faturamento'), 'Direto ao cliente');
    expect(screen.getByText('Contratações deste projeto não compõem receita própria.')).toBeInTheDocument();
  });
});
