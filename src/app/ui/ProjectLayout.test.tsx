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
    expect(names).toEqual(['Governança', 'Escopo', 'Cronograma', 'Partes Interessadas']);
    expect(within(bar).getByRole('link', { name: 'Escopo' })).toHaveAttribute('aria-current', 'page');
    expect(within(bar).getByRole('link', { name: 'Governança' })).not.toHaveAttribute('aria-current');
    expect(within(bar).getByRole('link', { name: 'Escopo' }).querySelector('svg')).not.toBeNull();

    const sections = screen.getByRole('navigation', { name: 'Seções' });
    expect(within(sections).getByRole('link', { name: 'EAP' })).toHaveAttribute('aria-current', 'page');
  });

  it('cabeçalho com projeto, status e ações globais', async () => {
    await renderAt('/projeto/governance/painel');
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
