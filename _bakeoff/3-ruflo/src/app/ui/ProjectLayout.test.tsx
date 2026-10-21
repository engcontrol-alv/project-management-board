import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { aSnapshot } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { defaultConfig, setModuleEnabled } from '@/project/config';
import { AppActionsContext, type AppActions } from '../shell';
import { ProjectLayout } from './ProjectLayout';

const actions: AppActions = { replaceProject: async () => {}, clearAll: async () => {} };

function renderAt(route: string, snapshot = aSnapshot().build()) {
  return renderWithProject(
    <AppActionsContext.Provider value={actions}>
      <Routes>
        <Route path="/projeto" element={<ProjectLayout />}>
          <Route path="*" element={<p>conteúdo</p>} />
        </Route>
      </Routes>
    </AppActionsContext.Provider>,
    { route, snapshot },
  );
}

describe('ProjectLayout — navegação horizontal', () => {
  it('sem sidebar; faixa de domínios com ícone + nome e aba ativa em qualquer seção', async () => {
    const { container } = await renderAt('/projeto/scope/eap');
    const bar = await screen.findByRole('navigation', { name: 'Domínios' });
    expect(container.querySelector('.sidebar')).toBeNull();
    const names = within(bar).getAllByRole('link').map((a) => a.textContent);
    expect(names).toEqual([
      'Geral',
      'Governança',
      'Escopo',
      'Cronograma',
      'Recursos',
      'Custos & Finanças',
      'Riscos',
      'Partes Interessadas',
    ]);
    // Divisória vertical entre "Geral" e os 7 domínios de desempenho.
    const divider = within(bar).getByRole('separator');
    expect(divider.previousElementSibling).toHaveTextContent('Geral');
    expect(divider.nextElementSibling).toHaveTextContent('Governança');
    expect(within(bar).getByRole('link', { name: 'Partes Interessadas' })).toHaveAttribute('href', '/projeto/stakeholders/cadastro');
    expect(within(bar).getByRole('link', { name: 'Escopo' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar).getByRole('link', { name: 'Governança' })).not.toHaveAttribute('aria-current');
    expect(within(bar).getByRole('link', { name: 'Escopo' }).querySelector('svg')).not.toBeNull();

    const sections = screen.getByRole('navigation', { name: 'Seções' });
    expect(within(sections).getByRole('link', { name: 'EAP' })).toHaveAttribute('aria-current', 'page');
  });

  it('ícones: Governança mantém o original (LayoutDashboard); Geral tem a mira técnica própria', async () => {
    await renderAt('/projeto/geral');
    const bar = await screen.findByRole('navigation', { name: 'Domínios' });
    const icon = (name: string) => within(bar).getByRole('link', { name }).querySelector('svg');
    expect(icon('Governança')).toHaveClass('lucide-layout-dashboard');
    const target = icon('Geral')!;
    expect(target).toHaveClass('icon-target');
    expect(target).not.toHaveClass('lucide-layout-dashboard');
    for (const [attr, value] of [['width', '16'], ['height', '16'], ['viewBox', '0 0 16 16'], ['fill', 'none'], ['stroke', 'currentColor'], ['stroke-width', '1.75']] as const)
      expect(target).toHaveAttribute(attr, value);
    expect(within(bar).getByRole('link', { name: 'Geral' })).toHaveTextContent('Geral');
  });

  it('cabeçalho sem logotipo: o carimbo começa pelo código e pelo nome do projeto', async () => {
    const { container } = await renderAt('/projeto/geral');
    await screen.findByRole('navigation', { name: 'Domínios' });
    const topbar = container.querySelector('.topbar')!;
    expect(container.querySelector('.app-header .brand-mark, .app-header .brand-emblem')).toBeNull();
    expect(topbar.firstElementChild).toHaveClass('tb-cell-code');
    expect(topbar.firstElementChild!.querySelector('.code-chip')).toHaveTextContent('PT-01');
    expect(topbar.children[1]).toHaveClass('tb-cell-name');
    expect(document.body.textContent).not.toMatch(/PMB/);
  });

  it('design system único: sem seletor de variante visual no cabeçalho', async () => {
    await renderAt('/projeto/geral');
    await screen.findByRole('navigation', { name: 'Domínios' });
    expect(screen.queryByLabelText('Variante visual')).toBeNull();
    expect(document.documentElement.dataset.designVariant).toBeUndefined();
  });

  it('ações globais incluem "Novo Projeto"', async () => {
    await renderAt('/projeto/geral');
    const toolbar = await screen.findByRole('toolbar', { name: 'Ações do projeto' });
    expect(within(toolbar).getByRole('button', { name: /Novo Projeto/ })).toBeInTheDocument();
  });

  it('Geral é a aba ativa na rota inicial do projeto, sem seções', async () => {
    await renderAt('/projeto/geral');
    const bar = await screen.findByRole('navigation', { name: 'Domínios' });
    expect(within(bar).getByRole('link', { name: 'Geral' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar).getByRole('link', { name: 'Governança' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('navigation', { name: 'Seções' })).toBeNull();
  });

  it('cabeçalho com projeto, status e ações globais', async () => {
    await renderAt('/projeto/geral');
    const toolbar = await screen.findByRole('toolbar', { name: 'Ações do projeto' });
    for (const name of [/Importar/, /Exportar/, /Projeto demo/, /Imprimir A4/, /Configurações/]) expect(within(toolbar).getByText(name)).toBeInTheDocument();
    expect(screen.getByText('PT-01')).toBeInTheDocument();
    expect(screen.getByText('Em iniciação')).toBeInTheDocument();
    expect(screen.getByText(/^RAG /)).toHaveClass('tb-badge');
    for (const caption of ['Código', 'Projeto', 'Status · RAG']) expect(screen.getByText(caption)).toHaveClass('tb-caption');
    expect(screen.getByLabelText('Data de status')).toBeInTheDocument();
    const notice = screen.getByText('Seus dados ficam apenas neste navegador. Exporte regularmente.');
    expect(notice.closest('nav')).toBeNull();
  });

  it('Imprimir A4 chama a impressão do navegador; navegação fica fora da folha', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await renderAt('/projeto/scope/eap');
    await userEvent.click(await screen.findByRole('button', { name: /Imprimir A4/ }));
    expect(print).toHaveBeenCalledOnce();
    expect(screen.getByRole('navigation', { name: 'Domínios' }).closest('.no-print')).not.toBeNull();
    expect(screen.getByRole('navigation', { name: 'Seções' })).toHaveClass('no-print');
    print.mockRestore();
  });

  it('Partes Interessadas continua acessível com o módulo desligado; módulo desligado sai da faixa', async () => {
    const config = setModuleEnabled(setModuleEnabled(defaultConfig(), 'stakeholders', false), 'scope', false);
    await renderAt('/projeto/pessoas', aSnapshot().withConfig(config).build());
    const bar = await screen.findByRole('navigation', { name: 'Domínios' });
    expect(within(bar).queryByRole('link', { name: 'Escopo' })).toBeNull();
    expect(within(bar).getByRole('link', { name: 'Partes Interessadas' })).toHaveAttribute('aria-current', 'page');
  });
});
