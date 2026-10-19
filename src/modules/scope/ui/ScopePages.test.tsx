import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aChangeRequest, aDocument, aGroup, aPackage, aPerson } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { WbsPage } from './WbsPage';
import { DeliverablesPage, CATEGORY_CHANGED_NOTICE } from './DeliverablesPage';
import { ChangeRequestsPage } from './ChangeRequestsPage';

const row = (container: HTMLElement, id: string) => container.querySelector<HTMLElement>(`tr[data-row-id="${id}"]`)!;

describe('WbsPage', () => {
  const wbs = () =>
    aSnapshot()
      .withPackage(
        aGroup({ id: 'G', code: '1' }),
        aPackage({ id: 'A', code: '1.1', parentId: 'G', duration: 5 }),
        aPackage({ id: 'B', code: '1.2', parentId: 'G', duration: 3, predecessorIds: ['A'] }),
      )
      .build();

  it('datas calculadas para pacotes e agrupadores', async () => {
    const { container } = await renderWithProject(<WbsPage />, { snapshot: wbs() });
    await screen.findByText('Pacote B');
    expect(within(row(container, 'B')).getByText('10/01/2026')).toBeInTheDocument();
    expect(within(row(container, 'B')).getByText('12/01/2026')).toBeInTheDocument();
    expect(within(row(container, 'G')).getByText('05/01/2026')).toBeInTheDocument();
    expect(within(row(container, 'G')).getByText('12/01/2026')).toBeInTheDocument();
  });

  it('predecessores não listam agrupadores; sem datas planejadas editáveis', async () => {
    await renderWithProject(<WbsPage />, { snapshot: wbs() });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar 1.2 Pacote B' }));
    const preds = screen.getByRole('group', { name: 'Predecessores' });
    expect(within(preds).getByLabelText('1.1 Pacote A')).toBeInTheDocument();
    expect(within(preds).queryByLabelText('1 Grupo G')).toBeNull();
    const dateLabels = [...screen.getByRole('dialog').querySelectorAll('input[type="date"]')].map(
      (i) => screen.getByRole('dialog').querySelector(`label[for="${i.id}"]`)?.textContent,
    );
    expect(dateLabels).toEqual(['Não começar antes de', 'Início real', 'Término real']);
  });

  it('predecessor que forma ciclo é recusado', async () => {
    const { load } = await renderWithProject(<WbsPage />, { snapshot: wbs() });
    await userEvent.click(await screen.findByRole('button', { name: 'Editar 1.1 Pacote A' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Predecessores' })).getByLabelText('1.2 Pacote B'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('dependência circular');
    expect((await load()).scope.wbs['A' as never]?.predecessorIds).toEqual([]);
  });
});

describe('DeliverablesPage', () => {
  const withTemplate = (s: ProjectSnapshot) => ({
    ...s,
    governance: {
      ...s.governance,
      profile: { ...s.governance.profile, documentTemplate: { template: 'Externo (cliente)' as const, notes: '' } },
    },
  });

  it('mostra o template da Governança e o herdado em itálico', async () => {
    const s = withTemplate(aSnapshot().withDeliverable(aDocument({ template: null })).build());
    const { container } = await renderWithProject(<DeliverablesPage />, { snapshot: s });
    expect(await screen.findByText('Externo (cliente)', { selector: 'strong' })).toBeInTheDocument();
    expect(within(row(container, 'd1')).getByText('Externo (cliente) (herdado)').tagName).toBe('EM');
  });

  it('template não definido', async () => {
    await renderWithProject(<DeliverablesPage />);
    expect(await screen.findByText('não definido', { selector: 'strong' })).toBeInTheDocument();
  });

  it('categoria física esconde revisão/template; trocar categoria limpa com aviso', async () => {
    await renderWithProject(<DeliverablesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    const dialog = screen.getByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByLabelText('Categoria'), 'Documentação de engenharia');
    expect(within(dialog).getByLabelText('Revisão')).toBeInTheDocument();
    await userEvent.selectOptions(within(dialog).getByLabelText('Tipo'), 'Memorial descritivo');
    await userEvent.selectOptions(within(dialog).getByLabelText('Status'), 'Em elaboração');

    await userEvent.selectOptions(within(dialog).getByLabelText('Categoria'), 'Entregável físico / serviço');
    expect(within(dialog).getByText(CATEGORY_CHANGED_NOTICE)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('Revisão')).toBeNull();
    expect(within(dialog).queryByLabelText('Template')).toBeNull();
    expect(within(dialog).getByLabelText('Tipo')).toHaveValue('');
    expect(within(dialog).getByLabelText('Status')).toHaveValue('');
    const types = [...within(dialog).getByLabelText<HTMLSelectElement>('Tipo').options].map((o) => o.value);
    expect(types).toContain('Equipamento');
    expect(types).not.toContain('Memorial descritivo');
  });

  it('exige categoria', async () => {
    await renderWithProject(<DeliverablesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    await userEvent.type(screen.getByLabelText('Nome'), 'Algo');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toHaveTextContent('Categoria');
  });
});

describe('ChangeRequestsPage', () => {
  const person = aPerson();
  const decided = { approverId: person.id, decisionDate: '2026-01-04' };

  it('botões só para transições permitidas', async () => {
    await renderWithProject(<ChangeRequestsPage />, {
      snapshot: aSnapshot().withParty(person).withChangeRequest(aChangeRequest()).build(),
    });
    expect(await screen.findByRole('button', { name: 'Em análise MUD-001' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancelada MUD-001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aprovada MUD-001' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Aplicar à linha de base' })).toBeNull();
  });

  it('aprovar pede aprovador e data da decisão', async () => {
    const { load } = await renderWithProject(<ChangeRequestsPage />, {
      snapshot: aSnapshot().withParty(person).withChangeRequest(aChangeRequest({ status: 'Em análise' })).build(),
    });
    await userEvent.click(await screen.findByRole('button', { name: 'Aprovada MUD-001' }));
    const dialog = screen.getByRole('dialog', { name: 'Aprovar MUD-001' });
    await userEvent.selectOptions(within(dialog).getByLabelText('Aprovador'), person.id);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirmar decisão' }));
    await waitFor(async () => expect((await load()).scope.changeRequests['cr1' as never]?.status).toBe('Aprovada'));
    expect((await load()).scope.changeRequests['cr1' as never]?.decisionDate).toBe(PROJECT_START);
  });

  it('"Aplicar à linha de base" só com LB e mudança aprovada', async () => {
    const base = aSnapshot()
      .withParty(person)
      .withPackage(aPackage({ id: 'A', duration: 5 }))
      .withChangeRequest(aChangeRequest({ status: 'Aprovada', ...decided }))
      .build();
    const s = { ...base, baselines: [snapshotBaseline(base, deriveProject(base, PROJECT_START), { id: 'b1', now: 'now', changeRequestId: null })] };
    const { load } = await renderWithProject(<ChangeRequestsPage />, { snapshot: s });
    expect(screen.queryByRole('button', { name: 'Implementada MUD-001' })).toBeNull();
    await userEvent.click(await screen.findByRole('button', { name: 'Aplicar à linha de base' }));
    await waitFor(async () => expect((await load()).baselines).toHaveLength(2));
    expect((await load()).scope.changeRequests['cr1' as never]?.status).toBe('Implementada');
  });

  it('sem LB, aprovada pode ser implementada manualmente', async () => {
    await renderWithProject(<ChangeRequestsPage />, {
      snapshot: aSnapshot().withParty(person).withChangeRequest(aChangeRequest({ status: 'Aprovada', ...decided })).build(),
    });
    expect(await screen.findByRole('button', { name: 'Implementada MUD-001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aplicar à linha de base' })).toBeNull();
  });

  it('?nova=1 abre o formulário de nova mudança', async () => {
    await renderWithProject(<ChangeRequestsPage />, { route: '/projeto/scope/mudancas?nova=1' });
    expect(await screen.findByRole('dialog', { name: /Novo/ })).toBeInTheDocument();
  });
});
