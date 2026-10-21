import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aMilestone, aPackage } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import { ganttLayout } from './gantt-layout';
import { SCurvePage } from './SCurvePage';
import { MilestonesPage } from './MilestonesPage';
import { GanttPage } from './GanttPage';
import { CriticalPathPage } from './CriticalPathPage';

describe('ganttLayout', () => {
  it('posição e largura com término inclusivo', () => {
    const l = ganttLayout({
      rangeStart: '2026-01-05',
      rangeEnd: '2026-01-31',
      pxPerDay: 10,
      bars: [
        { id: 'A', start: '2026-01-10', finish: '2026-01-12' },
        { id: 'M', start: '2026-01-12', finish: '2026-01-12', zeroDuration: true },
      ],
    });
    expect(l.A).toEqual({ x: 50, width: 30 });
    expect(l.M).toEqual({ x: 70, width: 0 });
  });
});

const planned = () =>
  aSnapshot()
    .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }), aPackage({ id: 'B', code: '2', duration: 3, predecessorIds: ['A'] }))
    .withMilestone(aMilestone({ predecessorIds: ['B' as never], manualDate: null }), aMilestone({ id: 'm2' as never, code: 'M-002', name: 'Contrato' }))
    .build();

describe('SCurvePage', () => {
  it('Review Focus 4: sem LB mostra mensagem e nenhum gráfico', async () => {
    const { container } = await renderWithProject(<SCurvePage />, { snapshot: planned() });
    expect(await screen.findByText('Defina a linha de base para ver a Curva S.')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('com LB mostra a tabela alternativa', async () => {
    const s = planned();
    const withLb = { ...s, baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'b', now: 'n', changeRequestId: null })] };
    await renderWithProject(<SCurvePage />, { snapshot: withLb });
    expect(await screen.findByText('Curva S física')).toBeInTheDocument();
    expect(screen.getByText('Tabela de dados')).toBeInTheDocument();
  });
});

describe('MilestonesPage', () => {
  it('Crítico é selo derivado; marco com predecessores não tem data manual', async () => {
    const { container } = await renderWithProject(<MilestonesPage />, { snapshot: planned() });
    await screen.findByText('Marco teste');
    expect(within(container.querySelector('tr[data-row-id="m1"]')!).getByText('Sim')).toBeInTheDocument();
    expect(within(container.querySelector('tr[data-row-id="m2"]')!).getByText('Não')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Editar M-001 Marco teste' }));
    expect(screen.queryByLabelText('Data manual')).toBeNull();
    expect(screen.queryByLabelText(/Crítico/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Editar M-002 Contrato' }));
    expect(screen.getByLabelText('Data manual')).toHaveValue('2026-02-01');
  });
});

describe('Gantt e caminho crítico', () => {
  it('renderizam a partir do CPM', async () => {
    const { unmount } = await renderWithProject(<GanttPage />, { snapshot: planned() });
    expect(await screen.findByRole('img', { name: 'Gráfico de Gantt' })).toBeInTheDocument();
    unmount();
    await renderWithProject(<CriticalPathPage />, { snapshot: planned() });
    expect(await screen.findByText('Pacote A')).toBeInTheDocument();
    expect(screen.getByText('Pacote B')).toBeInTheDocument();
  });

  it('Gantt: nomes ficam numa coluna fixa, fora da área que rola na horizontal', async () => {
    const { container } = await renderWithProject(<GanttPage />, { snapshot: planned() });
    const chart = await screen.findByRole('img', { name: 'Gráfico de Gantt' });
    const timeline = container.querySelector('.gantt-timeline')!;
    const labels = container.querySelector('.gantt-labels')!;
    expect(timeline).toContainElement(chart);
    expect(within(labels as HTMLElement).getByText('Pacote A')).toBeInTheDocument();
    expect(timeline.contains(labels)).toBe(false);
  });
});
