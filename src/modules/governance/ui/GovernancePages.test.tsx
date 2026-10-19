import { describe, expect, it } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import { aLesson, aMilestone, aNorm, aPackage } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { renderWithProject } from '@/test/render';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ProjectSnapshot } from '@/project/snapshot';
import { Dashboard } from './Dashboard';
import { BaselinePanel } from './BaselinePanel';
import { CharterPage } from './CharterPage';
import { DocsProcurementPage, OWN_REVENUE_NOTE } from './DocsProcurementPage';

function Where() {
  const l = useLocation();
  return <p>Rota: {l.pathname + l.search}</p>;
}

const delayed = (): ProjectSnapshot => {
  const s = aSnapshot()
    .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
    .withMilestone(aMilestone({ predecessorIds: ['A' as never], manualDate: null }))
    .withNorm(aNorm())
    .withProfile((p) => ({
      ...p,
      documentTemplate: { template: 'Externo (cliente)', notes: '' },
      procurementPolicy: { ...p.procurementPolicy, model: 'Concorrência', billing: 'Misto' },
    }))
    .build();
  const b = snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'b1', now: 'n', changeRequestId: null });
  const a = s.scope.wbs['A' as never]!;
  return { ...s, baselines: [b], scope: { ...s.scope, wbs: { A: { ...a, duration: 15 } } } as ProjectSnapshot['scope'] };
};

describe('Dashboard', () => {
  it('RAG com texto, alertas com atalho e definições do projeto', async () => {
    await renderWithProject(
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/projeto/scope/mudancas" element={<Where />} />
      </Routes>,
      { snapshot: delayed() },
    );
    expect(await screen.findByText('Painel executivo')).toBeInTheDocument();
    expect(screen.getAllByText('RAG Vermelho').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('RAG Cronograma')).toHaveTextContent('marco(s) crítico(s) atrasado(s)');
    expect(screen.getByText('ISO 9001:2015')).toBeInTheDocument();
    expect(screen.getByText('Externo (cliente)')).toBeInTheDocument();
    expect(screen.getByText(/Modalidade: Concorrência/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Processo/);

    await userEvent.click(screen.getByRole('button', { name: 'Abrir solicitação de mudança' }));
    expect(await screen.findByText('Rota: /projeto/scope/mudancas?nova=1')).toBeInTheDocument();
  });

  it('sem LB, SPI físico é n/a', async () => {
    await renderWithProject(<Dashboard />, { snapshot: aSnapshot().withPackage(aPackage({ id: 'A' })).build() });
    const label = await screen.findByText('SPI físico');
    expect(label.parentElement).toHaveTextContent('n/a');
  });
});

describe('BaselinePanel', () => {
  it('definir linha de base', async () => {
    await renderWithProject(<BaselinePanel />, { snapshot: aSnapshot().withPackage(aPackage({ id: 'A' })).build() });
    await userEvent.click(await screen.findByRole('button', { name: 'Definir linha de base' }));
    expect(await screen.findByText('Linha de base v1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Definir linha de base' })).toBeNull();
  });
});

describe('CharterPage', () => {
  it('lições registradas é derivado', async () => {
    await renderWithProject(<CharterPage />, { snapshot: aSnapshot().withLesson(aLesson()).build() });
    expect((await screen.findByText(/Lições registradas/)).textContent).toContain('Sim');
  });

  it('Encerrado sem termo mostra o erro do schema', async () => {
    const { load } = await renderWithProject(<CharterPage />);
    await userEvent.selectOptions(await screen.findByLabelText('Status do projeto'), 'Encerrado');
    await userEvent.click(screen.getByRole('button', { name: 'Salvar ficha' }));
    expect(await screen.findByText(/projeto encerrado exige termo de encerramento assinado/)).toBeInTheDocument();
    expect((await load()).governance.profile.charter.status).toBe('Em iniciação');
  });

  it('projeto encerrado: Reabrir e formulários desabilitados', async () => {
    const closed = aSnapshot()
      .withProfile((p) => ({
        ...p,
        charter: { ...p.charter, status: 'Encerrado' },
        closure: { ...p.closure, closureTermSigned: true, actualDate: '2026-01-04' },
      }))
      .build();
    const { load } = await renderWithProject(<CharterPage />, { snapshot: closed });
    expect(await screen.findByRole('button', { name: 'Salvar ficha' })).toBeDisabled();
    expect(screen.getByLabelText('Nome do projeto')).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Reabrir projeto' }));
    await waitFor(async () => expect((await load()).governance.profile.charter.status).toBe('Em execução'));
  });
});

describe('DocsProcurementPage', () => {
  it('grava o template e sinaliza faturamento direto ao cliente', async () => {
    const { load } = await renderWithProject(<DocsProcurementPage />);
    await userEvent.selectOptions(await screen.findByLabelText('Template de documentação'), 'Externo (cliente)');
    expect(screen.queryByText(OWN_REVENUE_NOTE)).toBeNull();
    await userEvent.selectOptions(screen.getByLabelText('Faturamento'), 'Direto ao cliente');
    expect(screen.getByText(OWN_REVENUE_NOTE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    await waitFor(async () => expect((await load()).governance.profile.documentTemplate.template).toBe('Externo (cliente)'));
    expect((await load()).governance.profile.procurementPolicy.billing).toBe('Direto ao cliente');
  });
});
