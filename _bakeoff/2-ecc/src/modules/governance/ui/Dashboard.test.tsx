import { screen, within } from '@testing-library/react';
import { Dashboard } from './Dashboard';
import { renderWithProject } from '@/test/render';
import { aSnapshot, milestone, norm, NOW, pkg } from '@/test/builders';

function lateScenario() {
  const s = aSnapshot()
    .wbs(pkg('A', 12))
    .milestones(milestone('M', ['A'], { code: 'M-001' }))
    .with((s) => {
      s.governance.norms['N' as never] = norm('N');
      s.governance.profile.documentTemplate.template = 'Externo (cliente)';
      s.governance.profile.procurementPolicy.model = 'Concorrência';
      s.governance.profile.procurementPolicy.billing = 'Direto ao cliente';
    })
    .build();
  s.baselines.push({
    id: 'b',
    projectId: s.project.id,
    version: 1,
    createdAt: NOW,
    changeRequestId: null,
    projectFinish: '2026-01-09',
    workPackages: { A: { start: '2026-01-05', finish: '2026-01-09', duration: 5 } },
    milestones: { M: { date: '2026-01-09' } },
    costItems: {},
    deliverables: {},
  });
  return s;
}

describe('Dashboard', () => {
  it('RAG geral e por módulo, sempre com texto e motivo', async () => {
    await renderWithProject(<Dashboard />, { snapshot: lateScenario() });
    const overall = await screen.findByTestId('rag-overall');
    expect(overall).toHaveTextContent('Vermelho');
    const schedule = screen.getByTestId('rag-schedule');
    expect(schedule).toHaveTextContent('Cronograma');
    expect(schedule).toHaveTextContent('Vermelho');
    expect(schedule).toHaveTextContent('marco(s) crítico(s) atrasado(s)');
  });

  it('alerta com atalho para nova mudança', async () => {
    await renderWithProject(<Dashboard />, { snapshot: lateScenario() });
    const alert = await screen.findByText('Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança');
    const link = within(alert.closest('li')!).getByRole('link', { name: 'Abrir solicitação de mudança' });
    expect(link).toHaveAttribute('href', '/projeto/scope/mudancas?nova=1');
  });

  it('KPIs formatados e n/a sem linha de base', async () => {
    await renderWithProject(<Dashboard />, { snapshot: aSnapshot().wbs(pkg('A', 5)).build() });
    const spi = (await screen.findByText('SPI físico')).closest('[data-testid="kpi"]')!;
    expect(spi).toHaveTextContent('n/a');
    const pct = screen.getByText('% físico').closest('[data-testid="kpi"]')!;
    expect(pct).toHaveTextContent('0,0%');
  });

  it('resumo das definições, sem Processos', async () => {
    const { container } = await renderWithProject(<Dashboard />, { snapshot: lateScenario() });
    const defs = await screen.findByTestId('definitions');
    expect(defs).toHaveTextContent('ISO 9001:2015');
    expect(defs).toHaveTextContent('Externo (cliente)');
    expect(defs).toHaveTextContent('Concorrência');
    expect(defs).toHaveTextContent('Direto ao cliente');
    expect(container.textContent).not.toMatch(/Process/i);
  });
});
