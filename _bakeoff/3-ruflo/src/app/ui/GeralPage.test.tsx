import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { aBudgetLine, aMilestone, aNorm, anOrganization, aPackage, aPerson, aProcurement, aRisk, aSupplier } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { SCurvePage } from '@/modules/schedule/ui/SCurvePage';
import { GeralPage } from './GeralPage';

function Where() {
  const l = useLocation();
  return <p>Rota: {l.pathname + l.search}</p>;
}

const withRoutes = (ui: React.ReactElement) => (
  <Routes>
    <Route path="/" element={ui} />
    <Route path="*" element={<Where />} />
  </Routes>
);

const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'n', changeRequestId: null })],
});

/** Pacote crítico atrasado depois da LB, com normas e estratégia definidas. */
const delayed = (): ProjectSnapshot => {
  const s = aSnapshot()
    .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
    .withMilestone(aMilestone({ predecessorIds: ['A' as never], manualDate: null }))
    .withNorm(aNorm())
    .withProfile((p) => ({
      ...p,
      documentTemplate: { template: 'Externo (cliente)', notes: '' },
      procurementPolicy: { ...p.procurementPolicy, model: 'Concorrência', billing: 'Misto' },
    }))
    .build();
  const a = s.scope.wbs['A' as never]!;
  const lb = withLb(s);
  return { ...lb, scope: { ...lb.scope, wbs: { A: { ...a, duration: 15 } } } as ProjectSnapshot['scope'] };
};

/** Projeto com custos, riscos e LB: EVM, quadro financeiro e riscos preenchidos. */
const project = () =>
  withLb(
    aSnapshot()
      .withStatusDate('2026-01-09')
      .withParty(aSupplier())
      .withPackage(aPackage({ id: 'A', code: '1', duration: 10, actualStart: PROJECT_START, percentComplete: 40 }))
      .withMilestone(aMilestone({ id: 'M' as never, predecessorIds: ['A' as never], manualDate: null }))
      .withBudgetLine(
        aBudgetLine({ workPackageId: 'A' as never, actualCents: 50_000, actualDate: '2026-01-06', status: 'Em andamento' }),
        aBudgetLine({ id: 'res' as never, code: 'ORC-002', category: 'Contingência', budgetedCents: 10_000 }),
      )
      .withProcurement(aProcurement({ budgetedCents: 100, committedCents: 200, contractStatus: 'Contratado', milestoneId: 'M' as never, dueDate: '2026-02-01' }))
      .withRisk(
        aRisk({ probability: 3, impact: 3, probabilityPct: 50, costImpactCents: 100_000 }),
        aRisk({ id: 'r2' as never, code: 'R-002', probability: 2, impact: 3 }),
      )
      .build(),
  );

/** Card do domínio no semáforo, pelo nome do domínio. */
const domainCard = (label: string) =>
  within(screen.getByRole('list', { name: 'Semáforo dos domínios' })).getByText(label, { selector: 'strong' }).closest('a')!;

describe('GeralPage — centro de comando', () => {
  it('situação por bolinha colorida (sem texto de cor), alerta com atalho e definições do projeto', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: delayed() });
    expect(await screen.findByRole('heading', { name: 'Painel executivo' })).toBeInTheDocument();
    const overall = within(screen.getByRole('heading', { name: 'Painel executivo' }).parentElement!).getByRole('img', { name: 'Situação: Vermelho' });
    expect(overall).toHaveClass('rag-dot');
    expect(overall).toHaveStyle({ background: 'var(--red)' });
    const schedule = domainCard('Cronograma');
    expect(schedule).toHaveTextContent('marco(s) crítico(s) atrasado(s)');
    expect(within(schedule).getByRole('img', { name: 'Situação: Vermelho' })).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/RAG|Verde|Amarelo|Vermelho/);
    expect(screen.getByText('ISO 9001:2015')).toBeInTheDocument();
    expect(screen.getByText('Externo (cliente)')).toBeInTheDocument();
    expect(screen.getByText(/Modalidade: Concorrência/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Processo/);
    await userEvent.click(screen.getByRole('button', { name: 'Abrir solicitação de mudança' }));
    expect(await screen.findByText('Rota: /projeto/governance/mudancas?nova=1')).toBeInTheDocument();
  });

  it('semáforo dos 7 domínios; clicar no card navega para o domínio', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: project() });
    const cards = await screen.findByRole('list', { name: 'Semáforo dos domínios' });
    expect(within(cards).getAllByRole('link').map((l) => l.querySelector('strong')?.textContent)).toEqual([
      'Governança',
      'Escopo',
      'Cronograma',
      'Recursos',
      'Finanças',
      'Riscos',
      'Partes Interessadas',
    ]);
    for (const link of within(cards).getAllByRole('link')) expect(within(link).getByRole('img', { name: /^Situação: / })).toHaveClass('rag-dot');
    await userEvent.click(domainCard('Riscos'));
    expect(await screen.findByText('Rota: /projeto/risks/registro')).toBeInTheDocument();
  });

  it('KPIs de valor agregado e prazo', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: project() });
    const evm = await screen.findByRole('region', { name: 'Valor agregado e prazo' });
    const labels = () => within(evm).getAllByText(/./, { selector: '.kpi-label' }).map((e) => e.textContent);
    expect(labels()).toEqual([
      'Orçamento Total (BAC)',
      'Previsto até a Data (PV)',
      'Trabalho Entregue (EV)',
      'Custo Realizado (AC)',
      'Eficiência de Custo (CPI)',
      'Ritmo do Prazo (SPI)',
      'Avanço físico',
    ]);
    expect(within(evm).getAllByText('0,80', { selector: '.kpi-value' })).toHaveLength(2);
    // Projeções avançadas: desligadas por padrão; o toggle revela só as que têm valor.
    const toggle = within(evm).getByRole('button', { name: 'Ver projeções avançadas (EAC, Variâncias)' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    expect(within(evm).queryByText('Estimativa no Término (EAC)')).toBeNull();
    await userEvent.click(toggle);
    expect(labels()).toEqual(expect.arrayContaining(['Estimativa no Término (EAC)', 'Variação de Custo (CV)', 'Variação de Prazo (SV)']));
    expect(within(evm).getByText('Trabalho Entregue − Custo Realizado; negativo = acima do custo', { selector: '.kpi-hint' })).toBeInTheDocument();
  });

  it('sem LB: SPI fica fora do DOM (sem "n/a"); o avanço físico continua', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: aSnapshot().withPackage(aPackage({ id: 'A' })).build() });
    const evm = await screen.findByRole('region', { name: 'Valor agregado e prazo' });
    expect(within(evm).queryByText('Ritmo do Prazo (SPI)', { selector: '.kpi-label' })).toBeNull();
    expect(within(evm).queryByRole('button', { name: /projeções avançadas/ })).toBeNull();
    expect(within(evm).getByText('Avanço físico', { selector: '.kpi-label' })).toBeInTheDocument();
    expect(within(evm).queryByText(/n\/a/)).toBeNull();
  });

  it('orçado × comprometido × realizado com miniatura e atalho da Curva S', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: project() });
    const money = await screen.findByRole('region', { name: 'Orçado × comprometido × realizado' });
    expect(within(money).getByText('Comprometido')).toBeInTheDocument();
    expect(within(money).getByRole('img', { name: 'Miniatura da Curva S' })).toBeInTheDocument();
    await userEvent.click(within(money).getByRole('link', { name: 'Abrir Curva S' }));
    expect(await screen.findByText('Rota: /projeto/schedule/curva-s')).toBeInTheDocument();
  });

  it('riscos por faixa e exposição financeira × contingência', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: project() });
    const risks = await screen.findByRole('region', { name: 'Riscos por faixa' });
    expect(within(risks).getByText('Crítico').closest('li')).toHaveTextContent('1');
    expect(within(risks).getByText('Alto').closest('li')).toHaveTextContent('1');
    expect(within(risks).getByText('Valor esperado dos riscos abertos').nextElementSibling).toHaveTextContent('R$ 500,00');
    expect(within(risks).getByText('Saldo de contingência').nextElementSibling).toHaveTextContent('R$ 100,00');
    expect(within(risks).getByText('Não cobre os riscos abertos')).toBeInTheDocument();
  });

  it('alertas cruzados com atalho para o registro', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: project() });
    const alerts = await screen.findByRole('region', { name: /Alertas/ });
    expect(within(alerts).getByText('CTR-001 comprometido acima do orçado')).toBeInTheDocument();
    expect(within(alerts).getAllByRole('button', { name: 'Abrir registro' }).length).toBeGreaterThan(0);
  });
});

describe('Curva S monetária', () => {
  it('com Finanças e BAC > 0: PV × EV × AC com SPI e CPI', async () => {
    await renderWithProject(<SCurvePage />, { snapshot: project() });
    expect(await screen.findByRole('heading', { name: 'Curva S — PV × EV × AC' })).toBeInTheDocument();
    expect(screen.getByText(/SPI/)).toHaveTextContent('CPI');
  });
  it('com Finanças desligado volta à curva física', async () => {
    const off = withLb(aSnapshot().withModule('finances', { enabled: false }).withPackage(aPackage({ id: 'A', duration: 5 })).build());
    await renderWithProject(<SCurvePage />, { snapshot: off });
    expect(await screen.findByRole('heading', { name: 'Curva S física' })).toBeInTheDocument();
  });
});

describe('Geral — multa contratual por atraso', () => {
  it('mostra a provisão e os marcos que a geram', async () => {
    const s = aSnapshot()
      .withProject({ statusDate: '2026-01-09' })
      .withProfile((p) => ({
        ...p,
        latePenalty: { ...p.latePenalty, enabled: true, ratePct: 0.1, period: 'Diário', base: 'Valor do contrato', contractValueCents: 150_000_000, capPct: 10 },
      }))
      .withMilestone(aMilestone({ code: 'M-002', manualDate: '2026-01-05' }))
      .build();
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: s });
    const card = await screen.findByRole('region', { name: 'Multa contratual por atraso' });
    expect(card).toHaveTextContent('R$ 6.000,00');
    expect(card).toHaveTextContent('M-002 · 4 dia(s)');
  });

  it('sem cláusula configurada: o bloco não é renderizado', async () => {
    await renderWithProject(withRoutes(<GeralPage />));
    expect(await screen.findByRole('heading', { name: 'Painel executivo' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Multa contratual por atraso' })).toBeNull();
    expect(screen.queryByText('Cláusula de multa não configurada.')).toBeNull();
  });
});

describe('Geral — campos nulos ficam fora do DOM', () => {
  /** Valores em branco que nunca devem aparecer na tela. */
  const PLACEHOLDERS = [/^n\/a$/, /^—$/, /não definid[ao]/, /não configurad[ao]/, /Nenhum alerta/, /Nenhuma norma/];

  it('a) projeto sem dados: sem KPIs, metadados, blocos ou títulos vazios', async () => {
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: aSnapshot().build() });
    expect(await screen.findByRole('heading', { name: 'Painel executivo' })).toBeInTheDocument();
    for (const p of PLACEHOLDERS) expect(screen.queryByText(p)).toBeNull();
    expect(document.body.textContent).not.toMatch(/n\/a/);
    for (const region of ['Valor agregado e prazo', 'Multa contratual por atraso', 'Orçado × comprometido × realizado', 'Curva S', 'Riscos por faixa', 'Definições do projeto'])
      expect(screen.queryByRole('region', { name: region })).toBeNull();
    expect(screen.queryByRole('region', { name: /^Alertas/ })).toBeNull();
    const meta = screen.getByRole('list', { name: 'Dados do projeto' });
    for (const label of ['Fase', 'LB', 'Término previsto', 'Cliente', 'Patrocinador', 'Gerente', 'Valor do contrato', 'Aprovação'])
      expect(within(meta).queryByText(label)).toBeNull();
    // A data de status sempre existe (manual ou hoje).
    expect(within(meta).getByText('Status')).toBeInTheDocument();
  });

  it('a) Finanças desligado: nenhum KPI monetário nem quadro financeiro, sem "n/a"', async () => {
    const off = withLb(aSnapshot().withModule('finances', { enabled: false }).withPackage(aPackage({ id: 'A', duration: 5 })).build());
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: off });
    const evm = await screen.findByRole('region', { name: 'Valor agregado e prazo' });
    const labels = within(evm).getAllByText(/./, { selector: '.kpi-label' }).map((e) => e.textContent);
    expect(labels).toEqual(['Ritmo do Prazo (SPI)', 'Avanço físico']);
    expect(evm.textContent).not.toMatch(/n\/a|desligado/);
    expect(screen.queryByRole('region', { name: 'Orçado × comprometido × realizado' })).toBeNull();
    // A Curva S física continua (há LB), em bloco próprio.
    expect(screen.getByRole('region', { name: 'Curva S' })).toBeInTheDocument();
  });

  it('b) domínios preenchidos: indicadores, metadados e blocos aparecem', async () => {
    const client = anOrganization({ id: 'cli' as never, code: 'PI-020', name: 'Cliente Exemplo S.A.' });
    const manager = aPerson({ id: 'gp' as never, code: 'PI-021', name: 'Gerente Exemplo' });
    const sponsor = aPerson({ id: 'sp' as never, code: 'PI-022', name: 'Patrocinador Exemplo' });
    const base = project();
    const s: ProjectSnapshot = {
      ...base,
      stakeholders: { ...base.stakeholders, parties: { ...base.stakeholders.parties, cli: client, gp: manager, sp: sponsor } as never },
      governance: {
        ...base.governance,
        norms: { n1: aNorm({ id: 'n1' as never }) } as never,
        profile: {
          ...base.governance.profile,
          charter: { ...base.governance.profile.charter, clientId: client.id, managerId: manager.id, sponsorId: sponsor.id, currentPhase: 'Engenharia', approvalDate: '2026-01-02' },
          documentTemplate: { template: 'Interno', notes: '' },
          latePenalty: { ...base.governance.profile.latePenalty, enabled: true, ratePct: 0.1, period: 'Diário', base: 'Valor do contrato', contractValueCents: 150_000_000, capPct: 10 },
        },
      },
    };
    await renderWithProject(withRoutes(<GeralPage />), { snapshot: s });
    const evm = await screen.findByRole('region', { name: 'Valor agregado e prazo' });
    expect(within(evm).getAllByText(/./, { selector: '.kpi-label' }).map((e) => e.textContent)).toEqual([
      'Orçamento Total (BAC)',
      'Previsto até a Data (PV)',
      'Trabalho Entregue (EV)',
      'Custo Realizado (AC)',
      'Eficiência de Custo (CPI)',
      'Ritmo do Prazo (SPI)',
      'Avanço físico',
    ]);
    const meta = screen.getByRole('list', { name: 'Dados do projeto' });
    for (const [label, value] of [
      ['Cliente', 'Cliente Exemplo S.A.'],
      ['Gerente', 'Gerente Exemplo'],
      ['Patrocinador', 'Patrocinador Exemplo'],
      ['Valor do contrato', 'R$ 1.500.000,00'],
      ['Fase', 'Engenharia'],
      ['Aprovação', '02/01/2026'],
      ['LB', 'v1'],
    ] as const)
      expect(within(meta).getByText(label).closest('li')).toHaveTextContent(value);
    expect(within(meta).getByText('Término previsto')).toBeInTheDocument();
    for (const region of ['Multa contratual por atraso', 'Orçado × comprometido × realizado', 'Riscos por faixa', 'Definições do projeto'])
      expect(screen.getByRole('region', { name: region })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: /^Alertas/ })).toBeInTheDocument();
    const defs = screen.getByRole('region', { name: 'Definições do projeto' });
    expect(defs).toHaveTextContent('Interno');
    expect(defs).not.toHaveTextContent(/não definid/);
    expect(document.body.textContent).not.toMatch(/n\/a/);
  });
});
