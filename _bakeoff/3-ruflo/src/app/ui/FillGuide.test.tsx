import { beforeEach, describe, expect, it } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { aBudgetLine, aDocument, aPackage, aRisk } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { GeralPage } from './GeralPage';
import { guideStorageKey } from './FillGuide';

function Where() {
  const l = useLocation();
  return <p>Rota: {l.pathname}</p>;
}

const render = (snapshot: ProjectSnapshot) =>
  renderWithProject(
    <Routes>
      <Route path="/" element={<GeralPage />} />
      <Route path="*" element={<Where />} />
    </Routes>,
    { snapshot },
  );

const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'n', changeRequestId: null })],
});

/** Escopo e Finanças preenchidos; Governança, LB e Riscos ainda pendentes. */
const partial = () =>
  aSnapshot()
    .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
    .withDeliverable(aDocument())
    .withBudgetLine(aBudgetLine({ budgetedCents: 100_000 }))
    .build();

const complete = () =>
  withLb(
    aSnapshot()
      .withProfile((p) => ({
        ...p,
        charter: { ...p.charter, approvalDate: '2026-01-02' },
        latePenalty: { ...p.latePenalty, contractValueCents: 150_000_000 },
      }))
      .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
      .withDeliverable(aDocument())
      .withBudgetLine(aBudgetLine({ budgetedCents: 100_000 }))
      .withRisk(aRisk())
      .build(),
  );

const guide = () => screen.getByRole('region', { name: 'Guia de Preenchimento do Projeto' });
const step = (title: string) => within(guide()).getByText(title, { selector: 'strong' }).closest('li')!;

describe('Guia de Preenchimento na aba Geral', () => {
  beforeEach(() => localStorage.clear());

  it('marca automaticamente os passos com dado, mostra o contador e não sai na impressão', async () => {
    await render(partial());
    await screen.findByRole('heading', { name: 'Painel executivo' });
    expect(guide()).toHaveClass('no-print');
    expect(within(guide()).getByText('2/5 passos iniciais concluídos')).toBeInTheDocument();
    const items = within(guide()).getAllByRole('listitem');
    expect(items.map((li) => li.querySelector('strong')!.textContent)).toEqual([
      'Governança',
      'Escopo',
      'Cronograma',
      'Finanças',
      'Riscos',
      'Rotina de Atualização',
    ]);
    for (const t of ['Escopo', 'Finanças']) expect(within(step(t)).getByRole('img', { name: 'Concluído' })).toBeInTheDocument();
    for (const t of ['Governança', 'Cronograma', 'Riscos'])
      expect(within(step(t)).getByRole('img', { name: 'Pendente' })).toBeInTheDocument();
    expect(within(step('Rotina de Atualização')).queryByRole('img', { name: /Concluído|Pendente/ })).toBeNull();
  });

  it('o atalho leva direto à aba do domínio', async () => {
    await render(partial());
    await screen.findByRole('region', { name: 'Guia de Preenchimento do Projeto' });
    await userEvent.click(within(step('Cronograma')).getByRole('link', { name: 'Abrir Cronograma →' }));
    expect(await screen.findByText('Rota: /projeto/schedule/marcos')).toBeInTheDocument();
  });

  it('"Ocultar guia" recolhe e persiste no localStorage; "Guia de Preenchimento" reabre', async () => {
    const { unmount } = await render(partial());
    await screen.findByRole('region', { name: 'Guia de Preenchimento do Projeto' });
    await userEvent.click(within(guide()).getByRole('button', { name: 'Ocultar guia' }));
    expect(screen.queryByRole('region', { name: 'Guia de Preenchimento do Projeto' })).toBeNull();
    await screen.findByRole('button', { name: /Guia de Preenchimento/ });
    const id = partial().project.id;
    expect(localStorage.getItem(guideStorageKey(id))).toBe('oculto');
    unmount();

    // A preferência sobrevive a uma nova montagem.
    await render(partial());
    const reopen = await screen.findByRole('button', { name: /Guia de Preenchimento/ });
    expect(reopen).toHaveTextContent('2/5 passos iniciais concluídos');
    expect(screen.queryByRole('region', { name: 'Guia de Preenchimento do Projeto' })).toBeNull();
    await userEvent.click(reopen);
    expect(guide()).toBeInTheDocument();
    expect(localStorage.getItem(guideStorageKey(id))).toBe('aberto');
  });

  it('com os 5 passos iniciais concluídos, inicia recolhido mostrando só o contador', async () => {
    await render(complete());
    const reopen = await screen.findByRole('button', { name: /Guia de Preenchimento/ });
    expect(reopen).toHaveTextContent('5/5 passos iniciais concluídos');
    expect(screen.queryByRole('region', { name: 'Guia de Preenchimento do Projeto' })).toBeNull();
    await userEvent.click(reopen);
    for (const t of ['Governança', 'Escopo', 'Cronograma', 'Finanças', 'Riscos'])
      expect(within(step(t)).getByRole('img', { name: 'Concluído' })).toBeInTheDocument();
  });

  it('módulo desligado na Governança sai do guia', async () => {
    await render(aSnapshot().withModule('risks', { enabled: false }).build());
    await screen.findByRole('heading', { name: 'Painel executivo' });
    expect(within(guide()).queryByText('Riscos', { selector: 'strong' })).toBeNull();
    expect(within(guide()).getByText('0/4 passos iniciais concluídos')).toBeInTheDocument();
  });
});
