import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aCommunication, anAnalysis, anOrganization, aPerson, aProcurement, aRisk, aSupplier } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { CommunicationsPage } from './CommunicationsPage';
import { PartiesPage } from './PartiesPage';
import { PowerInterestPage } from './PowerInterestPage';
import { SuppliersPage } from './SuppliersPage';

describe('PartiesPage — análise', () => {
  it('com o módulo ligado, "Analisar" mostra os campos e grava a análise', async () => {
    const { load } = await renderWithProject(<PartiesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    await userEvent.type(screen.getByLabelText('Nome / razão social'), 'Ana Cliente');
    expect(screen.queryByLabelText('Poder')).toBeNull();
    await userEvent.click(screen.getByLabelText('Analisar esta parte interessada'));
    await userEvent.selectOptions(screen.getByLabelText('Poder'), 'Alto');
    await userEvent.selectOptions(screen.getByLabelText('Engajamento atual'), 'Neutro');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(Object.values((await load()).stakeholders.parties)).toHaveLength(1));
    const [p] = Object.values((await load()).stakeholders.parties);
    expect(p!.analysis).toMatchObject({ power: 'Alto', currentPosture: 'Neutro' });
  });

  it('com o módulo desligado, só o cadastro básico', async () => {
    await renderWithProject(<PartiesPage />, { snapshot: aSnapshot().withModule('stakeholders', { enabled: false }).build() });
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    expect(screen.queryByLabelText('Analisar esta parte interessada')).toBeNull();
  });
});

describe('PowerInterestPage', () => {
  const snapshot = () =>
    aSnapshot()
      .withParty(
        aPerson({ id: 'a' as never, code: 'PI-001', name: 'Diretor do cliente', analysis: anAnalysis({ currentPosture: 'Neutro', desiredPosture: 'Apoiador' }) }),
        aPerson({ id: 'b' as never, code: 'PI-002', name: 'Vizinho da planta', analysis: anAnalysis({ power: 'Baixo', interest: 'Baixo' }) }),
        aSupplier({ analysis: anAnalysis({ power: 'Baixo', interest: 'Alto' }) }),
      )
      .withProcurement(aProcurement({ budgetedCents: 20_000_000, committedCents: 20_000_000, contractStatus: 'Contratado' }))
      .build();

  it('quadrantes do SPEC, lacuna de engajamento e fornecedor destacado', async () => {
    await renderWithProject(<PowerInterestPage />, { snapshot: snapshot() });
    const close = await screen.findByRole('button', { name: /Gerenciar de perto/ });
    expect(close).toHaveTextContent('1');
    for (const q of ['Manter satisfeito', 'Manter informado', 'Monitorar'])
      expect(screen.getByRole('button', { name: new RegExp(q) })).toBeInTheDocument();
    expect(screen.getByText('Neutro → Apoiador')).toBeInTheDocument();
    expect(screen.getByText('Comprometido acima do limite')).toBeInTheDocument();
  });

  it('clicar no quadrante filtra a lista', async () => {
    await renderWithProject(<PowerInterestPage />, { snapshot: snapshot() });
    const monitor = await screen.findByRole('button', { name: /Monitorar/ });
    await userEvent.click(monitor);
    expect(monitor).toHaveAttribute('aria-pressed', 'true');
    const list = screen.getByRole('table');
    expect(within(list).getByText('Vizinho da planta')).toBeInTheDocument();
    expect(within(list).queryByText('Diretor do cliente')).toBeNull();
  });
});

describe('CommunicationsPage', () => {
  it('comunicação vencida aparece como Atrasada', async () => {
    const s = aSnapshot().withCommunication(aCommunication({ nextDate: '2026-01-01' })).withStatusDate('2026-01-09').build();
    await renderWithProject(<CommunicationsPage />, { snapshot: s });
    expect(await screen.findByText('Atrasada')).toBeInTheDocument();
  });
});

describe('SuppliersPage — critério 8', () => {
  const s = () =>
    aSnapshot()
      .withStatusDate('2026-01-09')
      .withParty(aSupplier(), anOrganization({ id: 'cli' as never, code: 'PI-020', name: 'Só Cliente' }))
      .withProcurement(
        aProcurement({ budgetedCents: 1_500_000, committedCents: 1_200_000, actualCents: 300_000, contractStatus: 'Contratado', dueDate: '2026-01-07' }),
      )
      .withRisk(aRisk({ procurementIds: ['ctr1' as never] }));

  it('ficha do fornecedor: orçado, comprometido, realizado, atraso e riscos', async () => {
    await renderWithProject(<SuppliersPage />, { snapshot: s().build() });
    const card = await screen.findByRole('region', { name: 'PI-010 Fornecedor Teste' });
    expect(within(card).getByText('R$ 15.000,00')).toHaveClass('tb-mono');
    expect(within(card).getByText('R$ 12.000,00')).toBeInTheDocument();
    expect(within(card).getByText('R$ 3.000,00')).toBeInTheDocument();
    expect(within(card).getByText('Atrasada')).toBeInTheDocument();
    expect(within(card).getByText(/R-001 Atraso na importação/)).toBeInTheDocument();
    expect(screen.queryByText('Só Cliente')).toBeNull();
  });

  it('com Finanças desligado', async () => {
    await renderWithProject(<SuppliersPage />, { snapshot: s().withModule('finances', { enabled: false }).build() });
    expect(await screen.findByText(/Finanças desligado/)).toBeInTheDocument();
  });
});
