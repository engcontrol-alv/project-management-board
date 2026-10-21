import { screen, waitFor } from '@testing-library/react';
import { BaselinePanel } from './BaselinePanel';
import { renderWithProject } from '@/test/render';
import { aSnapshot, pkg } from '@/test/builders';

describe('BaselinePanel', () => {
  it('define a linha de base v1 uma única vez', async () => {
    const { user, snapshot } = await renderWithProject(<BaselinePanel />, { snapshot: aSnapshot().wbs(pkg('A', 5)).build() });
    await user.click(await screen.findByRole('button', { name: 'Definir linha de base' }));
    expect(await screen.findByText('Linha de base v1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Definir linha de base' })).toBeNull();
    await waitFor(async () => expect((await snapshot()).baselines).toHaveLength(1));
  });
});
