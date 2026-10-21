import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aChangeRequest, aLesson, aMilestone, aPackage, aPerson } from '@/test/factories';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { BaselinePanel } from './BaselinePanel';
import { ChangeRequestsPage } from './ChangeRequestsPage';
import { CharterPage } from './CharterPage';
import { DocsProcurementPage, OWN_REVENUE_NOTE } from './DocsProcurementPage';
import { ContractPage } from './ContractPage';
import { PhasesPage } from './PhasesPage';
import { governanceView } from './view';

describe('Governança sem o painel executivo', () => {
  it('seções próprias, sem duplicar o painel que mora em Geral', () => {
    expect(governanceView.sections.map((x) => x.label)).toEqual([
      'Abertura e encerramento',
      'Fases do ciclo de vida',
      'Normas',
      'Documentação e aquisições',
      'Mudanças',
      'Contrato',
      'Reuniões',
      'Lições aprendidas',
    ]);
  });
});

describe('PhasesPage', () => {
  it('fases em ordem, fase atual destacada, pacotes, marcos e atalho para editar', async () => {
    const s = aSnapshot()
      .withPackage(
        aPackage({ id: 'A', code: '1', duration: 5, phase: 'Análise', actualStart: PROJECT_START, actualFinish: '2026-01-09', percentComplete: 100 }),
        aPackage({ id: 'B', code: '2', duration: 3, phase: 'Execução', predecessorIds: ['A' as never] }),
      )
      .withMilestone(aMilestone({ phase: 'Execução', predecessorIds: ['B' as never], manualDate: null }))
      .withProfile((p) => ({ ...p, charter: { ...p.charter, currentPhase: 'Execução' } }))
      .build();
    await renderWithProject(<PhasesPage />, { snapshot: s });
    const table = await screen.findByRole('table', { name: 'Fases do ciclo de vida' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows[0]).toHaveTextContent('Conceituação');
    const exec = within(table).getByText('Execução').closest('tr')!;
    expect(exec).toHaveTextContent('Atual');
    expect(exec).toHaveTextContent('10/01/2026');
    expect(within(exec).getByText('1', { selector: '.phase-packages' })).toBeInTheDocument();
    expect(within(exec).getByText('1', { selector: '.phase-milestones' })).toBeInTheDocument();
    const analysis = within(table).getByText('Análise').closest('tr')!;
    expect(analysis).toHaveTextContent('Concluída');
    expect(analysis).toHaveTextContent('100,0%');
    expect(screen.getByRole('link', { name: 'Editar a lista de fases em Configurações' })).toHaveAttribute('href', '/projeto/configuracao');
  });
});

describe('BaselinePanel', () => {
  it('definir linha de base', async () => {
    await renderWithProject(<BaselinePanel />, { snapshot: aSnapshot().withPackage(aPackage({ id: 'A' })).build() });
    await userEvent.click(await screen.findByRole('button', { name: 'Definir linha de base' }));
    expect(await screen.findByText('Linha de base v1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Definir linha de base' })).toBeNull();
  });
});

describe('CharterPage', () => {
  it('lições registradas é derivado', async () => {
    await renderWithProject(<CharterPage />, { snapshot: aSnapshot().withLesson(aLesson()).build() });
    expect((await screen.findByText(/Lições registradas/)).textContent).toContain('Sim');
  });

  it('Encerrado sem termo mostra o erro do schema', async () => {
    const { load } = await renderWithProject(<CharterPage />);
    await userEvent.selectOptions(await screen.findByLabelText('Status do projeto'), 'Encerrado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(await screen.findByText(/projeto encerrado exige termo de encerramento assinado/)).toBeInTheDocument();
    expect((await load()).governance.profile.charter.status).toBe('Em iniciação');
  });

  it('projeto encerrado: Reabrir e formulários desabilitados', async () => {
    const closed = aSnapshot()
      .withProfile((p) => ({
        ...p,
        charter: { ...p.charter, status: 'Encerrado' },
        closure: { ...p.closure, closureTermSigned: true, actualDate: '2026-01-04' },
      }))
      .build();
    const { load } = await renderWithProject(<CharterPage />, { snapshot: closed });
    expect(await screen.findByRole('button', { name: 'Salvar ficha' })).toBeDisabled();
    expect(screen.getByLabelText('Nome do projeto')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir projeto' }));
    await waitFor(async () => expect((await load()).governance.profile.charter.status).toBe('Em execução'));
  });
});

describe('DocsProcurementPage', () => {
  it('grava o template e sinaliza faturamento direto ao cliente', async () => {
    const { load } = await renderWithProject(<DocsProcurementPage />);
    await userEvent.selectOptions(await screen.findByLabelText('Template de documentação'), 'Externo (cliente)');
    expect(screen.queryByText(OWN_REVENUE_NOTE)).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Faturamento'), 'Direto ao cliente');
    expect(screen.getByText(OWN_REVENUE_NOTE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect((await load()).governance.profile.documentTemplate.template).toBe('Externo (cliente)'));
    expect((await load()).governance.profile.procurementPolicy.billing).toBe('Direto ao cliente');
  });
});

describe('ContractPage (D7, D8)', () => {
  it('cláusula de multa desativada por padrão; ativar mostra os parâmetros e grava', async () => {
    const { load } = await renderWithProject(<ContractPage />);
    const on = await screen.findByLabelText('Aplicar multa por atraso');
    expect(on).not.toBeChecked();
    expect(screen.queryByLabelText('Multa por período (%)')).toBeNull();
    await userEvent.click(on);
    await userEvent.type(screen.getByLabelText('Multa por período (%)'), '0.1');
    await userEvent.selectOptions(screen.getByLabelText('Período'), 'Diário');
    await userEvent.selectOptions(screen.getByLabelText('Base de cálculo'), 'Valor do contrato');
    await userEvent.type(screen.getByLabelText('Valor do contrato'), '1.500.000,00');
    await userEvent.type(screen.getByLabelText('Teto (% do valor do contrato)'), '10');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect((await load()).governance.profile.latePenalty.enabled).toBe(true));
    expect((await load()).governance.profile.latePenalty).toMatchObject({
      ratePct: 0.1,
      period: 'Diário',
      base: 'Valor do contrato',
      contractValueCents: 150_000_000,
      capPct: 10,
    });
  });

  it('ativada sem percentual mostra o erro', async () => {
    await renderWithProject(<ContractPage />);
    await userEvent.click(await screen.findByLabelText('Aplicar multa por atraso'));
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('informe o percentual da multa por período');
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
    await waitFor(async () => expect((await load()).governance.changeRequests['cr1' as never]?.status).toBe('Aprovada'));
    expect((await load()).governance.changeRequests['cr1' as never]?.decisionDate).toBe(PROJECT_START);
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
    expect((await load()).governance.changeRequests['cr1' as never]?.status).toBe('Implementada');
  });

  it('sem LB, aprovada pode ser implementada manualmente', async () => {
    await renderWithProject(<ChangeRequestsPage />, {
      snapshot: aSnapshot().withParty(person).withChangeRequest(aChangeRequest({ status: 'Aprovada', ...decided })).build(),
    });
    expect(await screen.findByRole('button', { name: 'Implementada MUD-001' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Aplicar à linha de base' })).toBeNull();
  });

  it('?nova=1 abre o formulário de nova mudança', async () => {
    await renderWithProject(<ChangeRequestsPage />, { route: '/projeto/governance/mudancas?nova=1' });
    expect(await screen.findByRole('dialog', { name: /Novo/ })).toBeInTheDocument();
  });
});
