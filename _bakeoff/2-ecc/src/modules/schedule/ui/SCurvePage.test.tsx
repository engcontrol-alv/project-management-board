import { screen } from '@testing-library/react';
import { SCurvePage } from './SCurvePage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, NOW, pkg } from '@/test/builders';

describe('SCurvePage', () => {
  it('sem linha de base mostra a orientação e nenhum gráfico', async () => {
    const { container } = await renderWithProject(<SCurvePage />, { snapshot: aSnapshot().wbs(pkg('A', 5)).build() });
    expect(await screen.findByText('Defina a linha de base para ver a Curva S.')).toBeInTheDocument();
    expect(container.querySelector('svg.recharts-surface')).toBeNull();
  });

  it('com linha de base mostra gráfico e tabela alternativa', async () => {
    const s = aSnapshot().wbs(pkg('A', 14)).build();
    s.baselines.push({
      id: 'b',
      projectId: s.project.id,
      version: 1,
      createdAt: NOW,
      changeRequestId: null,
      projectFinish: '2026-01-18',
      workPackages: { A: { start: '2026-01-05', finish: '2026-01-18', duration: 14 } },
      milestones: {},
      costItems: {},
      deliverables: {},
    });
    const { container } = await renderWithProject(<SCurvePage />, { snapshot: s, today: '2026-01-12' });
    expect(await screen.findByRole('table')).toBeInTheDocument();
    expect(screen.getByText('57,1%')).toBeInTheDocument();
    expect(container.querySelector('svg.recharts-surface')).not.toBeNull();
  });
});
