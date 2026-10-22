import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aBudgetLine, aMilestone, anOrganization, aPackage, aProcurement, aRisk, aSupplier } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { CashflowPage } from './CashflowPage';
import { EvmPage } from './EvmPage';
import { ProcurementsPage } from './ProcurementsPage';
import { SummaryPage } from './SummaryPage';

const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'now', changeRequestId: null })],
});

describe('ProcurementsPage', () => {
  const s = () =>
    aSnapshot()
      .withParty(aSupplier(), anOrganization({ id: 'cli' as never, code: 'PI-020', name: 'Cliente Só' }))
      .build();

  it('fornecedor: só organizações Fornecedor/Prestador; sem fornecedor não salva', async () => {
    const { load } = await renderWithProject(<ProcurementsPage />, { snapshot: s() });
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    const supplier = screen.getByLabelText('Fornecedor');
    const options = within(supplier).getAllByRole('option').map((o) => o.textContent);
    expect(options).toContain('PI-010 Fornecedor Teste');
    expect(options).not.toContain('PI-020 Cliente Só');
    await userEvent.type(screen.getByLabelText('Descrição'), 'CLP redundante');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/fornecedor é obrigatório/)).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.selectOptions(supplier, 'PI-010 Fornecedor Teste');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect(Object.values((await load()).finances.procurements).map((p) => p.code)).toEqual(['CTR-001']));
  });

  it('Importado mostra país; moeda estrangeira mostra a taxa', async () => {
    await renderWithProject(<ProcurementsPage />, { snapshot: s() });
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    expect(screen.queryByLabelText('País de origem')).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Origem'), 'Importado');
    expect(screen.getByLabelText('País de origem')).toBeInTheDocument();
    expect(screen.queryByLabelText(/Taxa para BRL/)).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Moeda'), 'USD');
    expect(screen.getByLabelText(/Taxa para BRL/)).toBeInTheDocument();
  });

  it('caso 20: faturamento direto ao cliente avisa que não compõe receita própria', async () => {
    const direct = aSnapshot()
      .withProfile((p) => ({ ...p, procurementPolicy: { ...p.procurementPolicy, billing: 'Direto ao cliente' } }))
      .build();
    await renderWithProject(<ProcurementsPage />, { snapshot: direct });
    expect(await screen.findByText('Contratações deste projeto não compõem receita própria.')).toBeInTheDocument();
  });

  it('tabela com orçado, comprometido e realizado em mono', async () => {
    const one = aSnapshot()
      .withParty(aSupplier())
      .withProcurement(aProcurement({ committedCents: 900_000, contractStatus: 'Pedido emitido' }))
      .build();
    await renderWithProject(<ProcurementsPage />, { snapshot: one });
    expect(await screen.findByText('R$ 10.000,00')).toHaveClass('tb-mono');
    expect(screen.getByText('R$ 9.000,00')).toBeInTheDocument();
  });
});

describe('SummaryPage', () => {
  it('totais, saldo negativo com texto e contingência', async () => {
    const s = aSnapshot()
      .withParty(aSupplier())
      .withProcurement(aProcurement({ budgetedCents: 100_000, committedCents: 150_000, contractStatus: 'Contratado' }))
      .withBudgetLine(aBudgetLine({ id: 'c' as never, code: 'ORC-002', category: 'Contingência', budgetedCents: 10_000 }))
      .withRisk(aRisk({ probabilityPct: 50, costImpactCents: 100_000 }))
      .build();
    await renderWithProject(<SummaryPage />, { snapshot: s });
    expect(await screen.findByText('Saldo negativo')).toBeInTheDocument();
    const cont = screen.getByRole('region', { name: 'Contingência' });
    expect(within(cont).getByText('Reserva').nextElementSibling).toHaveTextContent('R$ 100,00');
    expect(within(cont).getByText('Não cobre os riscos abertos')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Por natureza' })).toHaveTextContent('CAPEX');
  });
});

describe('CashflowPage', () => {
  it('tabela mensal, itens sem data e risco de deslocamento', async () => {
    const pkg = aPackage({ id: 'A', code: '1', duration: 5 });
    const base = withLb(
      aSnapshot()
        .withPackage(pkg)
        .withBudgetLine(
          aBudgetLine({ plannedDate: '2026-02-10', workPackageId: 'A' as never }),
          aBudgetLine({ id: 'x' as never, code: 'ORC-002' }),
        )
        .build(),
    );
    const late = { ...base, scope: { ...base.scope, wbs: { ...base.scope.wbs, [pkg.id]: { ...pkg, duration: 12 } } } };
    await renderWithProject(<CashflowPage />, { snapshot: late });
    const table = await screen.findByRole('table', { name: 'Fluxo de caixa mensal' });
    expect(within(table).getByText('02/2026')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Itens sem data' })).toHaveTextContent('ORC-002');
    expect(screen.getByText('Risco de deslocamento')).toBeInTheDocument();
    // O gráfico é lazy: esperar o carregamento dentro do act. Com cache frio (logo após `npm ci`),
    // a primeira transformação do chunk do Recharts pode passar dos 4 s padrão.
    await waitFor(() => expect(screen.queryByText('Carregando gráfico…')).not.toBeInTheDocument(), {
      timeout: 20_000,
    });
  }, 30_000);
});

describe('EvmPage — modo essencial × avançado', () => {
  const evmProject = () =>
    aSnapshot()
      .withPackage(aPackage({ id: 'A', code: '1', duration: 10, actualStart: PROJECT_START, percentComplete: 40 }))
      .withBudgetLine(aBudgetLine({ workPackageId: 'A' as never, actualCents: 50_000, status: 'Em andamento' }), aBudgetLine({ id: 'u' as never, code: 'ORC-002' }))
      .withStatusDate('2026-01-09')
      .build();
  const labels = () => screen.getAllByText(/./, { selector: '.kpi-label' }).map((e) => e.textContent);
  const toggle = () => screen.getByRole('button', { name: 'Ver projeções avançadas (EAC, Variâncias)' });

  it('essencial por padrão: 6 indicadores em português, com sigla e legenda de origem', async () => {
    await renderWithProject(<EvmPage />, { snapshot: withLb(evmProject()) });
    await screen.findByText('Orçamento Total (BAC)', { selector: '.kpi-label' });
    expect(labels()).toEqual([
      'Orçamento Total (BAC)',
      'Previsto até a Data (PV)',
      'Trabalho Entregue (EV)',
      'Custo Realizado (AC)',
      'Eficiência de Custo (CPI)',
      'Ritmo do Prazo (SPI)',
    ]);
    for (const hint of [
      'Soma do orçamento planejado em Finanças',
      'Quanto deveria estar pronto hoje pela Linha de Base',
      'Orçamento × % de avanço físico dos pacotes na EAP (Escopo)',
      'Total já gasto/realizado nos itens de Finanças',
      'Trabalho Entregue ÷ Custo Realizado (meta ≥ 1,00)',
      'Trabalho Entregue ÷ Previsto até a Data (meta ≥ 1,00)',
    ])
      expect(screen.getByText(hint, { selector: '.kpi-hint' })).toBeInTheDocument();
    expect(screen.getAllByText('0,80', { selector: '.kpi-value' })).toHaveLength(2);
    expect(toggle()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText('Estimativa no Término (EAC)')).toBeNull();
    expect(screen.queryByRole('note', { name: 'O que falta preencher' })).toBeNull();
    expect(screen.getByText(/% do custo orçado não vinculado a pacotes/)).toHaveTextContent('50,0%');
  });

  it('"Ver projeções avançadas" revela EAC, ETC, VAC, CV e SV com legendas; clicar de novo esconde', async () => {
    await renderWithProject(<EvmPage />, { snapshot: withLb(evmProject()) });
    await userEvent.click(await screen.findByRole('button', { name: 'Ver projeções avançadas (EAC, Variâncias)' }));
    expect(toggle()).toHaveAttribute('aria-pressed', 'true');
    const advanced = screen.getByRole('region', { name: 'Projeções avançadas' });
    expect(within(advanced).getAllByText(/./, { selector: '.kpi-label' }).map((e) => e.textContent)).toEqual([
      'Estimativa no Término (EAC)',
      'Estimativa para Terminar (ETC)',
      'Variação no Término (VAC)',
      'Variação de Custo (CV)',
      'Variação de Prazo (SV)',
    ]);
    expect(within(advanced).getAllByText(/./, { selector: '.kpi-hint' })).toHaveLength(5);
    await userEvent.click(toggle());
    expect(screen.queryByRole('region', { name: 'Projeções avançadas' })).toBeNull();
  });

  it('dica do que falta preencher: sem LB, sem orçamento, sem custo realizado', async () => {
    const note = async () => screen.findByRole('note', { name: 'O que falta preencher' });
    const { unmount } = await renderWithProject(<EvmPage />, { snapshot: evmProject() });
    expect(await note()).toHaveTextContent('Defina a Linha de Base');
    unmount();
    const empty = await renderWithProject(<EvmPage />, { snapshot: aSnapshot().build() });
    expect(await note()).toHaveTextContent('Cadastre linhas de orçamento');
    empty.unmount();
    const noActual = withLb(
      aSnapshot().withPackage(aPackage({ id: 'A', duration: 10 })).withBudgetLine(aBudgetLine({ workPackageId: 'A' as never })).build(),
    );
    await renderWithProject(<EvmPage />, { snapshot: noActual });
    expect(await note()).toHaveTextContent('Lance o custo realizado');
    expect(await note()).not.toHaveTextContent('Linha de Base');
  });
});

describe('SummaryPage — multa por atraso (D7)', () => {
  const penalty = (p: ProjectSnapshot['governance']['profile']) => ({
    ...p,
    latePenalty: { ...p.latePenalty, enabled: true, ratePct: 0.1, period: 'Diário' as const, base: 'Valor do contrato' as const, contractValueCents: 150_000_000, capPct: 10 },
  });

  it('KPI de provisão e tabela por marco contratual atrasado', async () => {
    const s = aSnapshot()
      .withProject({ statusDate: '2026-01-09' })
      .withProfile(penalty)
      .withMilestone(aMilestone({ code: 'M-002', name: 'Engenharia aprovada', manualDate: '2026-01-05' }))
      .build();
    await renderWithProject(<SummaryPage />, { snapshot: s });
    const kpi = (await screen.findByText('Multa por atraso (provisão)')).closest('.kpi')!;
    expect(kpi).toHaveTextContent('R$ 6.000,00');
    const table = screen.getByRole('region', { name: 'Multa contratual por atraso' });
    const row = within(table).getByText('M-002').closest('tr')!;
    expect(row).toHaveTextContent('05/01/2026');
    expect(row).toHaveTextContent('4');
    expect(row).toHaveTextContent('R$ 6.000,00');
    expect(table).toHaveTextContent('0,1% por dia sobre o valor do contrato · teto 10%');
  });

  it('sem cláusula: indicador explica que não está configurada', async () => {
    await renderWithProject(<SummaryPage />);
    expect(await screen.findByText('Cláusula de multa não configurada')).toBeInTheDocument();
  });
});
