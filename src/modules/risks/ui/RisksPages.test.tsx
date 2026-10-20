import { describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aGroup, aPackage, aRisk } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { RiskMatrixPage } from './RiskMatrixPage';
import { RisksPage } from './RisksPage';

describe('RisksPage', () => {
  it('exposição derivada e "Não avaliado"', async () => {
    const s = aSnapshot()
      .withRisk(aRisk({ probability: 3, impact: 3 }), aRisk({ id: 'r2' as never, code: 'R-002', title: 'Sem nota', probability: null }))
      .build();
    await renderWithProject(<RisksPage />, { snapshot: s });
    expect(await screen.findByText('9 · Crítico')).toBeInTheDocument();
    expect(screen.getByText('Não avaliado')).toBeInTheDocument();
  });

  it('resposta conforme ameaça/oportunidade; vínculo só com pacotes de trabalho', async () => {
    const s = aSnapshot()
      .withPackage(aGroup({ id: 'G', code: '1', name: 'Engenharia' }), aPackage({ id: 'A', code: '1.1', name: 'Diagramas', parentId: 'G' as never }))
      .build();
    await renderWithProject(<RisksPage />, { snapshot: s });
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    const response = () => within(screen.getByLabelText('Tipo de resposta')).getAllByRole('option').map((o) => o.textContent);
    expect(response()).toContain('Mitigar');
    expect(response()).not.toContain('Explorar');
    await userEvent.selectOptions(screen.getByLabelText('Ameaça ou oportunidade'), 'Oportunidade');
    expect(response()).toContain('Explorar');
    const packages = screen.getByRole('group', { name: 'Pacotes' });
    expect(within(packages).getByText('1.1 Diagramas')).toBeInTheDocument();
    expect(within(packages).queryByText('1 Engenharia')).toBeNull();
  });

  it('vínculo com contratações some com Finanças desligado', async () => {
    await renderWithProject(<RisksPage />, { snapshot: aSnapshot().withModule('finances', { enabled: false }).build() });
    await userEvent.click(await screen.findByRole('button', { name: /Novo/ }));
    expect(screen.queryByRole('group', { name: 'Contratações' })).toBeNull();
  });
});

describe('RiskMatrixPage', () => {
  const s = () =>
    aSnapshot()
      .withRisk(
        aRisk({ probability: 3, impact: 3, title: 'Atraso do CLP', probabilityPct: 40, costImpactCents: 500_000 }),
        aRisk({ id: 'r2' as never, code: 'R-002', title: 'Falha no TAF', probability: 1, impact: 2, category: 'Técnico' }),
        aRisk({ id: 'r3' as never, code: 'R-003', title: 'Sem avaliação', probability: null }),
      )
      .build();

  it('grade 3×3 com contagem e faixa por texto; Alta em cima', async () => {
    await renderWithProject(<RiskMatrixPage />, { snapshot: s() });
    const grid = await screen.findByRole('grid', { name: 'Matriz probabilidade × impacto' });
    const rows = within(grid).getAllByRole('row');
    expect(rows[0]).toHaveTextContent('Alta');
    const critical = within(grid).getByRole('button', { name: 'Probabilidade Alta, impacto Alto: 1 risco(s), Crítico' });
    expect(critical).toHaveTextContent('Crítico');
    expect(screen.getByRole('region', { name: 'Não avaliados' })).toHaveTextContent('R-003');
  });

  it('clicar na célula filtra a tabela; exposição por categoria', async () => {
    await renderWithProject(<RiskMatrixPage />, { snapshot: s() });
    const cell = await screen.findByRole('button', { name: /Probabilidade Baixa, impacto Médio/ });
    await userEvent.click(cell);
    expect(cell).toHaveAttribute('aria-pressed', 'true');
    const table = screen.getByRole('table', { name: 'Riscos da seleção' });
    expect(within(table).getByText('Falha no TAF')).toBeInTheDocument();
    expect(within(table).queryByText('Atraso do CLP')).toBeNull();
    const cat = screen.getByRole('region', { name: 'Exposição por categoria' });
    expect(within(cat).getByText('Fornecedor/Aquisição').closest('tr')).toHaveTextContent('R$ 2.000,00');
  });
});
