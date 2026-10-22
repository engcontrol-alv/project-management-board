import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { aContext, aSnapshot } from '@/test/builders';
import { buildDemoSnapshot } from '@/test/demo-project';
import { renderWithProject } from '@/test/render';
import { setModuleEnabled } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { AppActionsContext, type AppActions } from '../shell';
import { ProjectLayout } from '../ui/ProjectLayout';

const actions: AppActions = { replaceProject: async () => {}, clearAll: async () => {} };
const reference = () => buildDemoSnapshot(aContext());

function renderAt(route: string, snapshot: ProjectSnapshot = reference()) {
  return renderWithProject(
    <AppActionsContext.Provider value={actions}>
      <Routes>
        <Route path="/projeto" element={<ProjectLayout />}>
          <Route path="*" element={<p>conteúdo da aba</p>} />
        </Route>
      </Routes>
    </AppActionsContext.Provider>,
    { route, snapshot },
  );
}

async function openComposer(route = '/projeto/scope/eap', snapshot?: ProjectSnapshot) {
  const utils = await renderAt(route, snapshot);
  await userEvent.click(await screen.findByRole('button', { name: /Imprimir A4/ }));
  return { ...utils, dialog: screen.getByRole('dialog', { name: 'Relatório executivo A4' }) };
}

const box = (dialog: HTMLElement, name: RegExp) => within(dialog).getByRole('checkbox', { name });
const report = () => screen.getByRole('article', { name: 'Relatório executivo A4' });
const sectionTitles = () =>
  within(report())
    .getAllByRole('heading', { level: 2 })
    .map((h) => h.textContent);

let print: ReturnType<typeof vi.fn>;
beforeEach(() => {
  print = vi.fn();
  vi.stubGlobal('print', print);
});
afterEach(() => vi.unstubAllGlobals());

describe('Compositor do relatório executivo', () => {
  it('"Imprimir A4" abre o compositor fora do cabeçalho, já no preset Resumo de Diretoria', async () => {
    const { dialog } = await openComposer();
    expect(dialog.closest('header')).toBeNull();
    expect(print).not.toHaveBeenCalled();
    expect(
      within(dialog).getByRole('button', { name: 'Resumo de Diretoria (1-2 págs)' }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    ).toHaveAttribute('aria-pressed', 'false');
    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(7);
    expect(box(dialog, /^Resumo executivo/)).toBeChecked();
    expect(box(dialog, /^Finanças/)).toBeChecked();
    expect(box(dialog, /^Riscos/)).toBeChecked();
    expect(box(dialog, /^Governança/)).not.toBeChecked();
    expect(box(dialog, /^Escopo/)).not.toBeChecked();
  });

  it('presets e marcar/desmarcar seções; sem nenhuma seção não gera', async () => {
    const { dialog } = await openComposer();
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    );
    for (const b of within(dialog).getAllByRole('checkbox')) expect(b).toBeChecked();
    expect(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(box(dialog, /^Escopo/));
    expect(box(dialog, /^Escopo/)).not.toBeChecked();
    // Seleção manual: nenhum preset fica marcado.
    expect(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    ).toHaveAttribute('aria-pressed', 'false');
    for (const b of within(dialog).getAllByRole('checkbox'))
      if ((b as HTMLInputElement).checked) await userEvent.click(b);
    expect(within(dialog).getByRole('button', { name: 'Gerar e Imprimir A4' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: 'Pré-visualizar' })).toBeDisabled();
  });

  it('módulo desligado: seção desmarcada, desabilitada e indicada; o preset Completo não a marca', async () => {
    const s = reference();
    const off = {
      ...s,
      project: { ...s.project, config: setModuleEnabled(s.project.config, 'finances', false) },
    };
    const { dialog } = await openComposer('/projeto/geral', off);
    const fin = box(dialog, /^Finanças/);
    expect(fin).not.toBeChecked();
    expect(fin).toBeDisabled();
    expect(fin.closest('label')).toHaveTextContent('módulo desligado');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    );
    expect(fin).not.toBeChecked();
  });
});

describe('Relatório executivo A4 (container de impressão)', () => {
  it('"Gerar e Imprimir A4": só as seções marcadas, carimbo, notas e window.print() — de qualquer aba', async () => {
    const { dialog } = await openComposer('/projeto/scope/eap');
    await userEvent.click(box(dialog, /^Governança/));
    await userEvent.click(box(dialog, /^Riscos/));
    await userEvent.type(
      within(dialog).getByLabelText('Observações executivas / notas da emissão'),
      'Aguardando aprovação do TAC.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gerar e Imprimir A4' }));

    expect(screen.queryByRole('dialog', { name: 'Relatório executivo A4' })).toBeNull();
    const r = report();
    expect(r).toHaveClass('executive-print-report');
    // Fora da árvore do app (portal no body): o print CSS esconde o app e deixa só o relatório.
    expect(r.closest('.shell')).toBeNull();
    expect(screen.getByText('conteúdo da aba')).toBeInTheDocument();
    expect(sectionTitles()).toEqual(['Resumo executivo', 'Governança', 'Finanças']);
    expect(within(r).getByRole('region', { name: 'Observações executivas' })).toHaveTextContent(
      'Aguardando aprovação do TAC.',
    );

    const stamp = within(r).getByRole('region', { name: 'Carimbo técnico' });
    for (const text of [
      'DEMO-AUT03',
      'Demonstração — Automação da Linha de Envase 3',
      'Bebidas Exemplo Indústria S.A.',
      'Carla Menezes',
      '05/01/2026',
    ])
      expect(stamp).toHaveTextContent(text);
    for (const term of [
      'Código',
      'Projeto',
      'Cliente',
      'Gerente',
      'Data de status',
      'Data de emissão',
      'Situação geral',
    ])
      expect(within(stamp).getByText(term)).toBeInTheDocument();
    expect(within(stamp).getByRole('img', { name: /^Situação: / })).toHaveClass('rag-dot');
    expect(print).toHaveBeenCalledTimes(1);
  });

  it('"Pré-visualizar" não imprime; "Imprimir" da barra imprime; "Fechar" remove o relatório', async () => {
    const { dialog } = await openComposer('/projeto/geral');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pré-visualizar' }));
    expect(report()).toBeInTheDocument();
    expect(print).not.toHaveBeenCalled();
    const bar = screen.getByRole('toolbar', { name: 'Pré-visualização do relatório' });
    expect(bar).toHaveClass('no-print');
    await userEvent.click(within(bar).getByRole('button', { name: 'Imprimir' }));
    expect(print).toHaveBeenCalledTimes(1);
    await userEvent.click(within(bar).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('article', { name: 'Relatório executivo A4' })).toBeNull();
  });

  it('Relatório Técnico Completo: conteúdo de cada seção, com bolinhas e sem texto de cor', async () => {
    const { dialog } = await openComposer('/projeto/geral');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pré-visualizar' }));
    const r = report();
    expect(sectionTitles()).toEqual([
      'Resumo executivo',
      'Governança',
      'Escopo',
      'Cronograma',
      'Finanças',
      'Riscos',
      'Recursos e Partes Interessadas',
    ]);
    const sec = (name: string) => within(r).getByRole('region', { name });

    const overview = sec('Resumo executivo');
    expect(
      within(overview).getAllByRole('img', { name: /^Situação: / }).length,
    ).toBeGreaterThanOrEqual(8);
    expect(overview).toHaveTextContent('Partes Interessadas');
    expect(within(overview).getByRole('list', { name: 'Alertas ativos' })).toHaveTextContent(
      'ENT-009 aceito pelo cliente com TAC/SAT Reprovado',
    );

    const gov = sec('Governança');
    expect(gov).toHaveTextContent('Bebidas Exemplo Indústria S.A.');
    expect(gov).toHaveTextContent('0,1% por dia sobre o valor do contrato · teto 10%');
    expect(within(gov).getByRole('table', { name: 'Fases do ciclo de vida' })).toHaveTextContent(
      'Engenharia',
    );
    expect(within(gov).getByRole('table', { name: 'Solicitações de mudança' })).toHaveTextContent(
      'MUD-001',
    );

    const scope = sec('Escopo');
    expect(within(scope).getByRole('table', { name: 'Pacotes de trabalho' })).toBeInTheDocument();
    const deliverables = within(scope).getByRole('table', { name: 'Entregáveis' });
    expect(within(deliverables).getByRole('row', { name: /ENT-009/ })).toHaveTextContent(
      /TAF Aprovado com Ressalvas.*TAC Reprovado/,
    );

    const schedule = sec('Cronograma');
    const milestones = within(schedule).getByRole('table', { name: 'Marcos contratuais' });
    expect(milestones).toHaveTextContent('M-002');
    expect(milestones).not.toHaveTextContent('M-003');
    expect(within(schedule).getByRole('table', { name: 'Caminho crítico' })).toBeInTheDocument();

    const fin = sec('Finanças');
    // Modo Essencial: os 6 indicadores com nome em português, sigla e legenda de origem; sem siglas cruas.
    const kpis = within(fin)
      .getAllByText(/./, { selector: '.kpi-label' })
      .map((e) => e.textContent);
    expect(kpis).toEqual([
      'Orçamento Total (BAC)',
      'Previsto até a Data (PV)',
      'Trabalho Entregue (EV)',
      'Custo Realizado (AC)',
      'Eficiência de Custo (CPI)',
      'Ritmo do Prazo (SPI)',
      'Multa por atraso (provisão)',
    ]);
    expect(
      within(fin).getByText('Trabalho Entregue ÷ Custo Realizado (meta ≥ 1,00)', {
        selector: '.kpi-hint',
      }),
    ).toBeInTheDocument();
    expect(fin).toHaveTextContent('Multa por atraso (provisão)');
    expect(fin).toHaveTextContent('R$ 12.000,00');
    expect(
      within(fin).getByRole('table', { name: 'Orçado × comprometido × realizado' }),
    ).toBeInTheDocument();
    const curve = within(fin).getByRole('img', { name: 'Curva S — PV × EV × AC' });
    expect(curve.tagName.toLowerCase()).toBe('svg');
    expect(curve.querySelectorAll('polyline').length).toBe(3);

    const risks = sec('Riscos');
    expect(
      within(risks).getByRole('table', { name: 'Riscos abertos Alto/Crítico' }),
    ).toHaveTextContent('R-001');
    expect(
      within(risks).getByRole('table', { name: 'Matriz probabilidade × impacto' }),
    ).toBeInTheDocument();

    const rs = sec('Recursos e Partes Interessadas');
    expect(within(rs).getByRole('table', { name: 'Carga de recursos' })).toBeInTheDocument();
    expect(rs).toHaveTextContent('Comunicações pendentes');
    expect(rs).toHaveTextContent('Fornecedores');

    expect(r.textContent).not.toMatch(/RAG|Verde|Amarelo|Vermelho/);
  });

  it('projeto vazio: seções aparecem com mensagens, sem quebrar', async () => {
    const { dialog } = await openComposer('/projeto/geral', aSnapshot().build());
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Pré-visualizar' }));
    expect(sectionTitles()).toHaveLength(7);
    expect(within(report()).getByRole('region', { name: 'Finanças' })).toHaveTextContent(
      'Defina a linha de base para ver a Curva S.',
    );
    // Resumo executivo omite campos nulos e a subseção de alertas vazia.
    const overview = within(report()).getByRole('region', { name: 'Resumo executivo' });
    expect(overview.textContent).not.toMatch(/n\/a|—|Nenhum alerta/);
    for (const term of ['Fase atual', 'Término previsto', 'Avanço físico (real × planejado)'])
      expect(within(overview).queryByText(term)).toBeNull();
    expect(within(overview).queryByRole('heading', { name: /Alertas ativos/ })).toBeNull();
    expect(within(overview).getByRole('list', { name: 'Saúde dos domínios' })).toBeInTheDocument();
  });

  it('campos nulos ficam fora: carimbo sem metadados vazios, identidade e KPIs sem "—", "n/a" ou "não definido"', async () => {
    const { dialog } = await openComposer('/projeto/geral', aSnapshot().build());
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Relatório Técnico Completo' }),
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Gerar e Imprimir A4' }));
    const stamp = within(report()).getByRole('region', { name: 'Carimbo técnico' });
    for (const term of ['Código', 'Projeto', 'Data de status', 'Data de emissão', 'Situação geral'])
      expect(within(stamp).getByText(term)).toBeInTheDocument();
    for (const term of ['Cliente', 'Gerente', 'Linha de base'])
      expect(within(stamp).queryByText(term)).toBeNull();
    expect(stamp.textContent).not.toMatch(/—|não definid/);

    const gov = within(report()).getByRole('region', { name: 'Governança' });
    for (const term of [
      'Cliente',
      'Patrocinador',
      'Gerente do projeto',
      'Objetivo',
      'Modalidade / faturamento',
    ])
      expect(within(gov).queryByText(term)).toBeNull();
    expect(within(gov).getByText('Situação', { selector: 'dt' })).toBeInTheDocument();
    expect(within(gov).queryByText('Cláusula de multa não configurada.')).toBeNull();

    const fin = within(report()).getByRole('region', { name: 'Finanças' });
    expect(fin.textContent).not.toMatch(/n\/a|não configurad/);
    expect(within(fin).queryByText('Multa por atraso (provisão)')).toBeNull();
    // O Guia de Preenchimento é da aba Geral e nunca entra na folha.
    expect(report().textContent).not.toMatch(/Guia de Preenchimento|passos iniciais/);
    expect(print).toHaveBeenCalledTimes(1);
  });
});
