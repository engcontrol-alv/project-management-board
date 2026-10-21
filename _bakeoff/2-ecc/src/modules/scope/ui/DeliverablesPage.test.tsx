import { screen, within } from '@testing-library/react';
import { DeliverablesPage } from './DeliverablesPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, docDeliverable } from '@/test/builders';

const withTemplate = (template: 'Interno' | 'Externo (cliente)' | null) =>
  aSnapshot()
    .deliverables(docDeliverable('D', { code: 'ENT-001' }))
    .with((s) => (s.governance.profile.documentTemplate.template = template))
    .build();

describe('DeliverablesPage', () => {
  it('mostra o template da Governança e o efetivo herdado em itálico', async () => {
    await renderWithProject(<DeliverablesPage />, { snapshot: withTemplate('Externo (cliente)') });
    expect(await screen.findByText('Template de documentação: Externo (cliente)')).toBeInTheDocument();
    const cell = screen.getByText('ENT-001').closest('tr')!;
    expect(within(cell).getByText('Externo (cliente)').tagName).toBe('EM');
  });

  it('sem template definido', async () => {
    await renderWithProject(<DeliverablesPage />, { snapshot: withTemplate(null) });
    expect(await screen.findByText('Template de documentação: não definido')).toBeInTheDocument();
  });

  it('categoria física esconde revisão/template e limita tipos e status', async () => {
    const { user } = await renderWithProject(<DeliverablesPage />, { snapshot: withTemplate(null) });
    await user.click(await screen.findByRole('button', { name: 'Novo' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Categoria'), 'Entregável físico / serviço');
    expect(within(dialog).queryByLabelText('Revisão')).toBeNull();
    expect(within(dialog).queryByLabelText(/Template/)).toBeNull();
    const types = within(within(dialog).getByLabelText('Tipo')).getAllByRole('option').map((o) => o.textContent);
    expect(types).toContain('Equipamento');
    expect(types).not.toContain('Memorial descritivo');
    const statuses = within(within(dialog).getByLabelText('Status')).getAllByRole('option').map((o) => o.textContent);
    expect(statuses).not.toContain('Emitido ao cliente');
  });

  it('trocar categoria limpa campos incompatíveis com aviso', async () => {
    const { user } = await renderWithProject(<DeliverablesPage />, { snapshot: withTemplate(null) });
    await user.click(await screen.findByRole('button', { name: 'Novo' }));
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Categoria'), 'Documentação de engenharia');
    await user.selectOptions(within(dialog).getByLabelText('Tipo'), 'Memorial descritivo');
    await user.selectOptions(within(dialog).getByLabelText('Status'), 'Emitido ao cliente');
    await user.selectOptions(within(dialog).getByLabelText('Categoria'), 'Entregável físico / serviço');
    expect(within(dialog).getByLabelText('Tipo')).toHaveValue('');
    expect(within(dialog).getByLabelText('Status')).toHaveValue('');
    expect(within(dialog).getByRole('status')).toHaveTextContent('Campos incompatíveis com a nova categoria foram limpos.');
  });

  it('salvar sem categoria é recusado', async () => {
    const { user } = await renderWithProject(<DeliverablesPage />, { snapshot: withTemplate(null) });
    await user.click(await screen.findByRole('button', { name: 'Novo' }));
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Nome'), 'Painel');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Categoria');
  });
});
