import { screen, within, waitFor } from '@testing-library/react';
import { RegisterView } from './RegisterView';
import type { FieldDef } from './fields';
import type { Example } from './examples';
import { renderWithProject } from '@/test/render';
import { aSnapshot, person, requirement } from '@/test/builders';
import type { Norm } from '@/modules/governance';
import type { Requirement } from '@/modules/scope';

const normFields: FieldDef[] = [
  { key: 'standard', label: 'Código da norma', type: 'text', hint: 'Ex.: ISO 9001:2015' },
  { key: 'type', label: 'Tipo', type: 'select', options: ['ISO', 'NR', 'Outra'] },
  { key: 'title', label: 'Título', type: 'text' },
];
const normExamples: Example<Norm>[] = [
  {
    title: 'Norma de qualidade',
    explanation: 'Sistema de gestão da qualidade exigido em contrato.',
    values: { standard: 'ISO 9001:2015', type: 'ISO', title: 'Gestão da qualidade', notes: '' },
  },
];
const newNorm = () => ({ id: '', code: '', standard: '', type: 'ISO', title: '', notes: '' }) as unknown as Norm;

function NormsRegister() {
  return (
    <RegisterView<Norm>
      module="governance"
      collection="norms"
      title="Normas aplicáveis"
      columns={[
        { key: 'standard', label: 'Norma' },
        { key: 'title', label: 'Título' },
      ]}
      fields={normFields}
      examples={normExamples}
      newEntity={newNorm}
    />
  );
}

describe('RegisterView', () => {
  it('exemplos orientam sem virar dado; "Usar como modelo" cria registro real', async () => {
    const { user, snapshot } = await renderWithProject(<NormsRegister />);
    const card = await screen.findByTestId('example-card');
    expect(within(card).getByText('Exemplo')).toBeInTheDocument();
    expect(Object.keys((await snapshot()).governance.norms)).toHaveLength(0);

    await user.click(within(card).getByRole('button', { name: 'Usar como modelo' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByLabelText('Código da norma')).toHaveValue('ISO 9001:2015');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));

    await waitFor(async () => expect(Object.values((await snapshot()).governance.norms)).toHaveLength(1));
    const saved = Object.values((await snapshot()).governance.norms)[0]!;
    expect(saved.code).toBe('NRM-001');
    expect(saved.id).not.toBe('');
    await waitFor(() => expect(screen.queryByTestId('example-card')).toBeNull());
    expect(await screen.findByText('NRM-001')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Ver exemplos' }));
    expect(screen.getByTestId('example-card')).toBeInTheDocument();
  });

  it('"Usar como modelo" deixa vínculos vazios', async () => {
    const fields: FieldDef[] = [
      { key: 'description', label: 'Descrição', type: 'textarea' },
      { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    ];
    const { ownerId: _o, ...rest } = requirement('x', { ownerId: 'P' as never });
    const examples: Example<Requirement>[] = [
      { title: 'Req', explanation: 'x', values: { ...rest, ownerId: 'P' as never } as never },
    ];
    const { user } = await renderWithProject(
      <RegisterView<Requirement>
        module="scope"
        collection="requirements"
        title="Requisitos"
        columns={[{ key: 'description', label: 'Descrição' }]}
        fields={fields}
        examples={examples}
        newEntity={() => ({ ...requirement(''), code: '' })}
      />,
      { snapshot: aSnapshot().parties(person('P')).build() },
    );
    await user.click(await screen.findByRole('button', { name: 'Usar como modelo' }));
    expect(within(await screen.findByRole('dialog')).getByLabelText('Responsável')).toHaveValue('');
  });

  it('excluir registro usado mostra onde é usado', async () => {
    const s = aSnapshot()
      .parties(person('P', { code: 'PI-001', name: 'Ana' }))
      .with((s) => (s.governance.profile.charter.managerId = 'P' as never))
      .build();
    const { user } = await renderWithProject(
      <RegisterView
        module="stakeholders"
        collection="parties"
        title="Pessoas"
        columns={[{ key: 'name', label: 'Nome' }]}
        fields={[{ key: 'name', label: 'Nome', type: 'text' }]}
        examples={[]}
        newEntity={() => person('')}
      />,
      { snapshot: s },
    );
    await user.click(await screen.findByRole('button', { name: 'Excluir PI-001' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não é possível excluir: usado em Ficha do projeto');
  });

  it('erro do comando aparece no formulário, que continua aberto', async () => {
    const { user } = await renderWithProject(<NormsRegister />);
    await user.click(await screen.findByRole('button', { name: 'Novo' }));
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Salvar' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Código da norma: campo obrigatório');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
