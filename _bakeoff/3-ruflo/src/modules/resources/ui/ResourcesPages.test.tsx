import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { anAllocation, aResource } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { AllocationsPage } from './AllocationsPage';
import { histogramBars } from './LoadHistogram';
import { LoadPage } from './LoadPage';
import { ResourcesPage } from './ResourcesPage';

describe('histogramBars', () => {
  it('altura proporcional ao máximo; acima da capacidade marca over', () => {
    const bars = histogramBars(
      [
        { week: '2026-01-05', demandPct: 110, capacityPct: 100, overPct: 110 },
        { week: '2026-01-12', demandPct: 55, capacityPct: 100, overPct: null },
      ],
      { height: 200, maxPct: 220 },
    );
    expect(bars.map((b) => [b.height, b.over])).toEqual([[100, true], [50, false]]);
  });
});

describe('ResourcesPage', () => {
  it('custo homem-hora e custo/dia derivado (8 h)', async () => {
    await renderWithProject(<ResourcesPage />, { snapshot: aSnapshot().withResource(aResource()).build() });
    expect(await screen.findByText('R$ 150,00/h')).toHaveClass('tb-mono');
    expect(screen.getByText('R$ 1.200,00/dia')).toBeInTheDocument();
  });

  it('pessoa só para tipos pessoa; organização só para terceirizado/equipe', async () => {
    await renderWithProject(<ResourcesPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    expect(screen.getByLabelText('Pessoa')).toBeInTheDocument();
    expect(screen.queryByLabelText('Organização')).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Tipo'), 'Equipamento');
    expect(screen.queryByLabelText('Pessoa')).toBeNull();
  });
});

describe('AllocationsPage', () => {
  it('término antes do início mostra o erro; custo estimado informativo', async () => {
    const s = aSnapshot().withResource(aResource()).withAllocation(anAllocation()).build();
    await renderWithProject(<AllocationsPage />, { snapshot: s });
    expect(await screen.findByText('R$ 3.000,00')).toBeInTheDocument();
    expect(screen.getByText('informativo')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Novo/ }));
    await userEvent.selectOptions(screen.getByLabelText('Recurso'), 'REC-001 Engenheiro de automação');
    await userEvent.type(screen.getByLabelText('Início'), '2026-01-10');
    await userEvent.type(screen.getByLabelText('Término'), '2026-01-05');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(await screen.findByText(/término deve ser igual ou posterior ao início/)).toBeInTheDocument();
  });
});

describe('LoadPage', () => {
  it('histograma SVG com capacidade, rótulo de sobrecarga e tabela alternativa', async () => {
    const s = aSnapshot()
      .withResource(aResource())
      .withAllocation(anAllocation({ pct: 60 }), anAllocation({ id: 'a2' as never, code: 'ALO-002', pct: 50 }))
      .build();
    await renderWithProject(<LoadPage />, { snapshot: s });
    const chart = await screen.findByRole('img', { name: 'Histograma de carga' });
    expect(within(chart).getByText('110%')).toBeInTheDocument();
    expect(chart.querySelector('.load-capacity')).not.toBeNull();
    const table = screen.getByRole('table', { name: 'Carga semanal' });
    expect(within(table).getByText('05/01/2026')).toBeInTheDocument();
    expect(within(table).getByText('Sobrealocado')).toBeInTheDocument();
  });

  it('sem alocações', async () => {
    await renderWithProject(<LoadPage />, { snapshot: aSnapshot().withResource(aResource()).build() });
    expect(await screen.findByText(/Cadastre alocações/)).toBeInTheDocument();
  });
});
