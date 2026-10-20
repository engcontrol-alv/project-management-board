import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { aBudgetLine, aPackage, aRisk } from '@/test/factories';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { resolveConfig } from '@/project/config';
import { toExport } from '@/project/serialization';
import { downloadText } from '@/shared/lib/download';
import { AppActionsContext, type AppActions } from '../shell';
import { ConfigPage } from './ConfigPage';
import { ClearDataCard, DataMenu } from './DataMenu';

vi.mock('@/shared/lib/download', () => ({ downloadText: vi.fn() }));

const noopActions: AppActions = { replaceProject: async () => {}, clearAll: async () => {} };
const withActions = (ui: ReactElement) => <AppActionsContext.Provider value={noopActions}>{ui}</AppActionsContext.Provider>;

describe('ConfigPage', () => {
  it('dependência Cronograma ⇄ Escopo, dados preservados', async () => {
    const { load } = await renderWithProject(withActions(<ConfigPage />), { snapshot: aSnapshot().withPackage(aPackage({ id: 'A' })).build() });
    await userEvent.click(await screen.findByLabelText(/^Escopo/));
    expect(await screen.findByText('Cronograma depende de Escopo e também foi desligado.')).toBeInTheDocument();
    let cfg = resolveConfig((await load()).project.config);
    expect([cfg.enabled.scope, cfg.enabled.schedule]).toEqual([false, false]);
    expect(Object.keys((await load()).scope.wbs)).toEqual(['A']);

    await userEvent.click(screen.getByLabelText(/^Cronograma/));
    await waitFor(async () => {
      cfg = resolveConfig((await load()).project.config);
      expect([cfg.enabled.scope, cfg.enabled.schedule]).toEqual([true, true]);
    });
  });

  it('parâmetros, avisos, Governança sem interruptor e link de pessoas', async () => {
    const s = aSnapshot().build();
    s.project.config.modules.governance = { enabled: true, settings: { staleChangeDays: 'x' } };
    const { load } = await renderWithProject(withActions(<ConfigPage />), { snapshot: s });
    expect(await screen.findByText('Parâmetros inválidos em Governança: valores padrão restaurados.')).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Governança/)).toBeNull();
    expect(screen.getByRole('link', { name: 'Pessoas e organizações' })).toBeInTheDocument();

    const tol = screen.getByLabelText('Tolerância de marco (dias)');
    await userEvent.clear(tol);
    await userEvent.type(tol, '3');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar parâmetros do Cronograma' }));
    await waitFor(async () =>
      expect(resolveConfig((await load()).project.config).settings.schedule.milestoneToleranceDays).toBe(3),
    );
  });
});

describe('ConfigPage — etapa 2', () => {
  it('desligar Finanças não desliga outros módulos e preserva os dados', async () => {
    const s = aSnapshot().withBudgetLine(aBudgetLine()).build();
    const { load } = await renderWithProject(withActions(<ConfigPage />), { snapshot: s });
    await userEvent.click(await screen.findByLabelText(/^Custos & Finanças/));
    await waitFor(async () => expect(resolveConfig((await load()).project.config).enabled.finances).toBe(false));
    const cfg = resolveConfig((await load()).project.config);
    expect(Object.entries(cfg.enabled).filter(([, on]) => !on).map(([k]) => k)).toEqual(['finances']);
    expect(Object.keys((await load()).finances.budgetLines)).toEqual(['orc1']);
  });

  it('parâmetros de Finanças, Riscos e Recursos', async () => {
    const { load } = await renderWithProject(withActions(<ConfigPage />), { snapshot: aSnapshot().withRisk(aRisk()).build() });
    const cpi = await screen.findByLabelText('CPI verde a partir de');
    await userEvent.clear(cpi);
    await userEvent.type(cpi, '0,9');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar parâmetros de Custos & Finanças' }));
    await waitFor(async () => expect(resolveConfig((await load()).project.config).settings.finances.cpiGreenMin).toBe(0.9));

    const red = screen.getByLabelText('Sobrealocação vermelha acima de (%)');
    await userEvent.clear(red);
    await userEvent.type(red, '130');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar parâmetros de Recursos' }));
    await waitFor(async () => expect(resolveConfig((await load()).project.config).settings.resources.overallocationRedPct).toBe(130));

    const cats = screen.getByLabelText('Categorias de risco (uma por linha)');
    await userEvent.clear(cats);
    await userEvent.type(cats, 'Técnico');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar parâmetros de Riscos' }));
    expect(await screen.findByText('Categoria "Fornecedor/Aquisição" está em uso e não pode ser removida.')).toBeInTheDocument();
  });
});

describe('DataMenu', () => {
  const actions = (): AppActions => ({ replaceProject: vi.fn(async () => {}), clearAll: vi.fn(async () => {}) });
  const fileOf = (text: string) => new File([text], 'p.json', { type: 'application/json' });

  async function renderMenu(a: AppActions) {
    return renderWithProject(
      <AppActionsContext.Provider value={a}>
        <DataMenu />
      </AppActionsContext.Provider>,
    );
  }

  it('exporta com o nome padrão', async () => {
    await renderMenu(actions());
    const button = await screen.findByRole('button', { name: /Exportar/ });
    await waitFor(() => expect(button).toBeEnabled());
    await userEvent.click(button);
    expect(downloadText).toHaveBeenCalledWith('pmb-pt-01-2026-01-05.json', expect.stringContaining('"format": "pmb-export"'));
  });

  it('importação válida mostra prévia e pede confirmação', async () => {
    const a = actions();
    await renderMenu(a);
    const other = aSnapshot().withProject({ info: { name: 'Outro projeto', code: 'OUT', startDate: '2026-03-01' } }).withPackage(aPackage({ id: 'A' })).build();
    fireEvent.change(await screen.findByLabelText(/Importar/), { target: { files: [fileOf(JSON.stringify(toExport(other, 'n')))] } });
    const dialog = await screen.findByRole('dialog', { name: 'Substituir o projeto atual?' });
    expect(within(dialog).getByText('Outro projeto')).toBeInTheDocument();
    expect(within(dialog).getByText('Exporte o projeto atual antes de substituir.')).toBeInTheDocument();
    expect(within(dialog).getByText('EAP')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Substituir' }));
    expect(a.replaceProject).toHaveBeenCalledWith(other);
  });

  it('importação inválida não altera nada', async () => {
    const a = actions();
    await renderMenu(a);
    fireEvent.change(await screen.findByLabelText(/Importar/), { target: { files: [fileOf('não é json')] } });
    expect(await screen.findByText('O arquivo não é um JSON válido.')).toBeInTheDocument();
    expect(a.replaceProject).not.toHaveBeenCalled();
  });

  it('apagar dados locais exige APAGAR', async () => {
    const a = actions();
    await renderWithProject(
      <AppActionsContext.Provider value={a}>
        <ClearDataCard />
      </AppActionsContext.Provider>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /Apagar dados locais/ }));
    await userEvent.type(screen.getByLabelText('Digite APAGAR para confirmar'), 'APAGAR');
    await userEvent.click(screen.getByRole('button', { name: 'Confirmar' }));
    expect(a.clearAll).toHaveBeenCalledOnce();
  });
});
