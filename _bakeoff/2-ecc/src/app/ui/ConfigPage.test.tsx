import { screen, waitFor } from '@testing-library/react';
import { ConfigPage } from './ConfigPage';
import { renderWithProject } from '@/test/render';
import { aSnapshot, pkg } from '@/test/builders';
import { resolveConfig } from '@/project/config';

describe('ConfigPage', () => {
  it('desligar Escopo desliga Cronograma com aviso e preserva dados', async () => {
    const { user, snapshot } = await renderWithProject(<ConfigPage />, { snapshot: aSnapshot().wbs(pkg('A', 5)).build() });
    await user.click(await screen.findByRole('checkbox', { name: 'Escopo' }));
    expect(await screen.findByText('Cronograma depende de Escopo e também foi desligado.')).toBeInTheDocument();
    await waitFor(async () => expect(resolveConfig((await snapshot()).project.config).enabled.schedule).toBe(false));
    expect(Object.keys((await snapshot()).scope.wbs)).toEqual(['A']);
    await user.click(screen.getByRole('checkbox', { name: 'Cronograma' }));
    await waitFor(async () => expect(resolveConfig((await snapshot()).project.config).enabled.scope).toBe(true));
  });

  it('Governança não tem interruptor; link para pessoas', async () => {
    await renderWithProject(<ConfigPage />);
    await screen.findByRole('checkbox', { name: 'Escopo' });
    expect(screen.queryByRole('checkbox', { name: 'Governança' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Pessoas e organizações' })).toBeInTheDocument();
  });

  it('altera a tolerância dos marcos', async () => {
    const { user, snapshot } = await renderWithProject(<ConfigPage />);
    const input = await screen.findByLabelText('Tolerância de "Atenção" dos marcos (dias)');
    await user.clear(input);
    await user.type(input, '3');
    await user.click(screen.getByRole('button', { name: 'Salvar parâmetros' }));
    await waitFor(async () =>
      expect(resolveConfig((await snapshot()).project.config).settings.schedule.milestoneToleranceDays).toBe(3),
    );
  });

  it('mostra aviso de parâmetros inválidos', async () => {
    const s = aSnapshot()
      .with((s) => (s.project.config.modules.schedule = { enabled: true, settings: { milestoneToleranceDays: 'x' } }))
      .build();
    await renderWithProject(<ConfigPage />, { snapshot: s });
    expect(await screen.findByText('Parâmetros inválidos em Cronograma; os valores padrão foram restaurados.')).toBeInTheDocument();
  });
});
