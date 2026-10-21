import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aPerson, aRequirement } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';
import type { Norm } from '@/modules/governance';
import type { Requirement } from '@/modules/scope';
import { RegisterView } from './RegisterView';
import type { Example, FieldDef } from './types';

const normFields: FieldDef[] = [
  { key: 'standard', label: 'Norma', type: 'text', hint: 'Ex.: ISO 9001:2015' },
  { key: 'type', label: 'Tipo', type: 'select', options: ['ISO', 'NR'] },
  { key: 'title', label: 'Título', type: 'text' },
];
const normExamples: Example<Norm>[] = [
  { title: 'Norma de qualidade', explanation: 'Uma norma ISO.', values: { standard: 'ISO 9001:2015', type: 'ISO', title: 'Qualidade', notes: '' } },
];
const newNorm = () => ({ standard: '', type: 'ISO', title: '', notes: '', code: '' });

function NormsRegister() {
  return (
    <RegisterView<Norm>
      module="governance"
      collection="norms"
      title="Normas"
      columns={[{ key: 'code', label: 'Código' }, { key: 'standard', label: 'Norma' }]}
      fields={normFields}
      examples={normExamples}
      newEntity={newNorm}
    />
  );
}

describe('ConfirmTypedDialog', () => {
  it('só habilita com a palavra exata', async () => {
    render(<ConfirmTypedDialog open title="Apagar" word="APAGAR" onConfirm={() => {}} onCancel={() => {}} />);
    const input = screen.getByLabelText('Digite APAGAR para confirmar');
    await userEvent.type(input, 'apagar');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeDisabled();
    await userEvent.clear(input);
    await userEvent.type(input, 'APAGAR');
    expect(screen.getByRole('button', { name: 'Confirmar' })).toBeEnabled();
  });
});

describe('RegisterView', () => {
  it('exemplos orientam, não viram dado; "Usar como modelo" cria registro real', async () => {
    const { load } = await renderWithProject(<NormsRegister />);
    expect(await screen.findByText('Exemplo')).toBeInTheDocument();
    expect(Object.keys((await load()).governance.norms)).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Usar como modelo' }));
    expect(screen.getByLabelText('Norma')).toHaveValue('ISO 9001:2015');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));

    await waitFor(async () => expect(Object.values((await load()).governance.norms)).toHaveLength(1));
    const [norm] = Object.values((await load()).governance.norms);
    expect(norm?.code).toBe('NRM-001');
    expect(norm?.id).not.toBe('');
    await waitFor(() => expect(screen.queryByText('Exemplo')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Ver exemplos' })).toBeInTheDocument();
  });

  it('"Usar como modelo" deixa vínculos vazios', async () => {
    const examples: Example<Requirement>[] = [
      { title: 'Req', explanation: 'x', values: { description: 'Exemplo', ownerId: 'alguem' as never, deliverableIds: ['d' as never] } },
    ];
    await renderWithProject(
      <RegisterView<Requirement>
        module="scope"
        collection="requirements"
        title="Requisitos"
        columns={[]}
        fields={[
          { key: 'description', label: 'Descrição', type: 'text' },
          { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties' },
        ]}
        examples={examples}
        newEntity={() => ({ ...aRequirement(), code: '' })}
      />,
      { snapshot: aSnapshot().withParty(aPerson()).build() },
    );
    await userEvent.click(await screen.findByRole('button', { name: 'Usar como modelo' }));
    expect(screen.getByLabelText('Descrição')).toHaveValue('Exemplo');
    expect(screen.getByLabelText('Responsável')).toHaveValue('');
  });

  it('excluir registro usado mostra onde é usado', async () => {
    const p = aPerson();
    await renderWithProject(
      <RegisterView
        module="stakeholders"
        collection="parties"
        title="Pessoas"
        columns={[{ key: 'name', label: 'Nome' }]}
        fields={[]}
        examples={[]}
        newEntity={() => ({})}
      />,
      { snapshot: aSnapshot().withParty(p).withRequirement(aRequirement({ ownerId: p.id })).build() },
    );
    await userEvent.click(await screen.findByRole('button', { name: `Excluir ${p.code} ${p.name}` }));
    await userEvent.click(screen.getByRole('button', { name: 'Excluir' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não é possível excluir: usado em REQ-001 Requisito teste');
  });

  it('erro do comando aparece no formulário e o diálogo continua aberto', async () => {
    await renderWithProject(<NormsRegister />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Norma: norma é obrigatória');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
