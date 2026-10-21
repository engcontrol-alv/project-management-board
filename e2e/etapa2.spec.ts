import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { domainCard, importReferenceProject, situationDot } from './support';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function go(page: Page, path: string) {
  await page.goto(`/#${path}`);
}

async function createProject(page: Page) {
  await page.goto('/');
  await page.getByLabel('Nome').fill('Projeto E2E 2');
  await page.getByLabel('Código').fill('E2E-02');
  await page.getByLabel('Data de início').fill('2026-01-05');
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.getByText('Painel executivo')).toBeVisible();
  // Data de status antes do início: o cálculo depende só do plano (sem reprojeção).
  await page.getByLabel('Data de status').fill('2026-01-04');
}

async function save(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();
}

async function openNew(page: Page) {
  await page.getByRole('button', { name: 'Novo', exact: true }).click();
  return page.getByRole('dialog');
}

async function addOrganization(page: Page, name: string, role: string) {
  await go(page, '/projeto/stakeholders/cadastro');
  const d = await openNew(page);
  await d.getByLabel('Tipo').selectOption('Organização');
  await d.getByLabel('Nome / razão social').fill(name);
  await d.getByRole('group', { name: 'Papéis' }).getByLabel(role).check();
  await save(page);
  await expect(page.getByRole('cell', { name, exact: true })).toBeVisible();
}

async function addPackage(page: Page, name: string, duration: number, preds: string[] = []) {
  await go(page, '/projeto/scope/eap');
  const d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill(name);
  await d.getByLabel('Duração (dias corridos)').fill(String(duration));
  for (const p of preds) await d.getByRole('group', { name: 'Predecessores' }).getByLabel(p).check();
  await save(page);
}

async function exportProject(page: Page): Promise<{ schemaVersion: number; data: Record<string, unknown[]> }> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  return JSON.parse(readFileSync(await (await download).path(), 'utf8'));
}

const financeTables = (f: { data: Record<string, unknown[]> }) =>
  Object.fromEntries(Object.entries(f.data).filter(([t]) => t.startsWith('finances_')));

test('Review Focus 1: arquivo exportado na Etapa 1 importa e reexporta na versão atual (v3)', async ({ page }) => {
  await page.goto('/');
  await page.locator('#start-import').setInputFiles(fixture('projeto-v1.json'));
  await expect(page.getByText('Painel executivo')).toBeVisible();
  await go(page, '/projeto/stakeholders/cadastro');
  await expect(page.getByRole('cell', { name: 'Painéis Elétricos Fictícios Ltda.', exact: true })).toBeVisible();
  await go(page, '/projeto/finances/contratacoes');
  await expect(page.getByText('Exemplo').first()).toBeVisible();
  const file = await exportProject(page);
  expect(file.schemaVersion).toBe(4);
  expect((file.data.stakeholders_parties as { analysis: unknown }[]).every((p) => p.analysis === null)).toBe(true);
});

test('Critério 8: contratação exige fornecedor por ID e aparece na ficha do fornecedor', async ({ page }) => {
  await createProject(page);
  await addOrganization(page, 'Só Cliente S.A.', 'Cliente');
  await addOrganization(page, 'Painéis Teste Ltda.', 'Fornecedor');

  await go(page, '/projeto/finances/contratacoes');
  const d = await openNew(page);
  const supplier = d.getByLabel('Fornecedor');
  await expect(supplier.locator('option', { hasText: 'Só Cliente S.A.' })).toHaveCount(0);
  await d.getByLabel('Descrição').fill('Fabricação dos painéis');
  await d.getByLabel('Orçado').fill('100.000,00');
  await d.getByRole('button', { name: 'Salvar' }).click();
  await expect(d.getByText(/fornecedor é obrigatório/)).toBeVisible();
  await supplier.selectOption({ label: 'PI-002 Painéis Teste Ltda.' });
  await save(page);
  await expect(page.getByRole('cell', { name: 'CTR-001', exact: true })).toBeVisible();

  await go(page, '/projeto/stakeholders/fornecedores');
  const card = page.getByRole('region', { name: 'PI-002 Painéis Teste Ltda.' });
  await expect(card.getByText('R$ 100.000,00')).toBeVisible();
  await expect(card.getByText('Fabricação dos painéis')).toBeVisible();
});

test('Critério 5 (completo): atraso crítico atualiza Cronograma e alertas sem alterar Finanças', async ({ page }) => {
  await createProject(page);
  await addOrganization(page, 'Fornecedor Crítico Ltda.', 'Fornecedor');
  await addPackage(page, 'Pacote A', 5);
  await addPackage(page, 'Pacote B', 3, ['1 Pacote A']);
  await go(page, '/projeto/schedule/marcos');
  let d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill('TAF aprovado');
  await d.getByRole('group', { name: 'Predecessores (pacotes)' }).getByLabel('2 Pacote B').check();
  await save(page);

  await go(page, '/projeto/finances/contratacoes');
  d = await openNew(page);
  await d.getByLabel('Descrição').fill('CLP importado');
  await d.getByLabel('Fornecedor').selectOption({ label: 'PI-001 Fornecedor Crítico Ltda.' });
  await d.getByLabel('Marco que depende da entrega').selectOption({ label: 'M-001 TAF aprovado' });
  await d.getByLabel('Prazo de entrega previsto').fill('2026-01-25');
  await save(page);

  await go(page, '/projeto/geral');
  await page.getByRole('button', { name: 'Definir linha de base' }).click();
  await expect(page.getByText('Linha de base v1')).toBeVisible();
  const before = financeTables(await exportProject(page));

  await go(page, '/projeto/scope/eap');
  await page.getByRole('button', { name: 'Editar 1 Pacote A' }).click();
  await page.getByRole('dialog').getByLabel('Duração (dias corridos)').fill('12');
  await save(page);

  await go(page, '/projeto/geral');
  await expect(situationDot(domainCard(page, 'Cronograma'), 'Vermelho')).toBeVisible();
  await expect(page.getByText('Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança')).toBeVisible();
  await expect(page.getByText('Entrega de CTR-001 ameaça o marco M-001')).toBeVisible();
  expect(financeTables(await exportProject(page))).toEqual(before);
});

test('Critério 7: desligar Finanças oculta o módulo e o CPI; religar preserva os dados', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/finances/orcamento');
  await page.getByRole('button', { name: 'Usar como modelo' }).first().click();
  await save(page);
  await expect(page.getByRole('cell', { name: 'ORC-001', exact: true })).toBeVisible();

  await go(page, '/projeto/configuracao');
  await page.getByLabel(/^Custos & Finanças/).click();
  await expect(page.getByLabel(/^Custos & Finanças/)).not.toBeChecked();
  await expect(page.getByRole('navigation', { name: 'Domínios' }).getByRole('link', { name: 'Custos & Finanças' })).toHaveCount(0);
  await go(page, '/projeto/geral');
  // Critério 7: o CPI fica "n/a" no painel Geral com o módulo desligado.
  const evm = page.getByRole('region', { name: 'Valor agregado e prazo' });
  await expect(evm.locator('.kpi').filter({ has: page.locator('.kpi-label', { hasText: /^CPI$/ }) })).toContainText('n/a');

  await go(page, '/projeto/configuracao');
  await page.getByLabel(/^Custos & Finanças/).click();
  await expect(page.getByLabel(/^Custos & Finanças/)).toBeChecked();
  await go(page, '/projeto/finances/orcamento');
  await expect(page.getByRole('cell', { name: 'ORC-001', exact: true })).toBeVisible();
});

test('Riscos: P3 × I3 é Crítico, deixa a situação vermelha e a matriz filtra', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/risks/registro');
  const d = await openNew(page);
  await d.getByLabel('Título').fill('Atraso na importação do CLP');
  await d.getByLabel('Probabilidade (1–3)').fill('3');
  await d.getByLabel('Impacto (1–3)').fill('3');
  await save(page);
  await expect(page.getByText('9 · Crítico')).toBeVisible();

  await go(page, '/projeto/geral');
  await expect(situationDot(domainCard(page, 'Riscos'), 'Vermelho')).toBeVisible();

  await go(page, '/projeto/risks/matriz');
  const cell = page.getByRole('button', { name: 'Probabilidade Alta, impacto Alto: 1 risco(s), Crítico' });
  await cell.click();
  await expect(cell).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table', { name: 'Riscos da seleção' }).getByText('Atraso na importação do CLP')).toBeVisible();
});

test('Recursos: duas alocações de 60% na mesma semana = 120% e situação amarela', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/resources/recursos');
  let d = await openNew(page);
  await d.getByLabel('Nome').fill('Engenheiro de automação');
  await save(page);
  for (const code of ['1', '2']) {
    await go(page, '/projeto/resources/alocacoes');
    d = await openNew(page);
    await d.getByLabel('Recurso').selectOption({ label: 'REC-001 Engenheiro de automação' });
    await d.getByLabel('Dedicação (%)').fill('60');
    await d.getByLabel('Início').fill('2026-01-05');
    await d.getByLabel('Término').fill('2026-01-09');
    await save(page);
    await expect(page.getByRole('cell', { name: `ALO-00${code}`, exact: true })).toBeVisible();
  }
  await go(page, '/projeto/resources/carga');
  await expect(page.getByRole('img', { name: 'Histograma de carga' }).getByText('120%', { exact: true })).toBeVisible();
  await go(page, '/projeto/geral');
  await expect(situationDot(domainCard(page, 'Recursos'), 'Amarelo')).toBeVisible();
});

test('Projeto importado: 7 domínios cruzados no painel, Curva S monetária, matriz e histograma', async ({ page }) => {
  await importReferenceProject(page);
  const bar = page.getByRole('navigation', { name: 'Domínios' });
  const domains = ['Governança', 'Escopo', 'Cronograma', 'Recursos', 'Custos & Finanças', 'Riscos', 'Partes Interessadas'];
  await expect(bar.getByRole('link')).toHaveText(['Geral', ...domains]);
  await expect(bar.getByRole('link', { name: 'Geral' })).toHaveAttribute('aria-current', 'page');
  await expect(bar.getByRole('separator')).toBeVisible();
  // Situação só pela bolinha: nenhum domínio sem dados e nenhum texto "RAG"/cor na tela.
  for (const m of domains) {
    await expect(domainCard(page, m).getByRole('img', { name: /^Situação: / })).toBeVisible();
    await expect(situationDot(domainCard(page, m), 'Sem dados')).toHaveCount(0);
  }
  await expect(page.locator('body')).not.toContainText(/RAG|Verde|Amarelo|Vermelho/);
  await expect(page.getByText('CPI', { exact: true })).toBeVisible();
  await expect(page.getByText('EAC', { exact: true })).toBeVisible();
  await expect(page.getByText('Entrega de CTR-001 ameaça o marco M-004')).toBeVisible();
  // Clicar no card do semáforo leva ao domínio.
  await domainCard(page, 'Riscos').click();
  await expect(page).toHaveURL(/#\/projeto\/risks\/registro$/);
  await expect(bar.getByRole('link', { name: 'Riscos' })).toHaveAttribute('aria-current', 'page');

  await go(page, '/projeto/schedule/curva-s');
  await expect(page.getByRole('heading', { name: 'Curva S — PV × EV × AC' })).toBeVisible();
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
  await go(page, '/projeto/risks/matriz');
  await expect(page.getByRole('grid', { name: 'Matriz probabilidade × impacto' })).toBeVisible();
  await go(page, '/projeto/resources/carga');
  await expect(page.getByRole('img', { name: 'Histograma de carga' })).toBeVisible();
  await go(page, '/projeto/stakeholders/fornecedores');
  await expect(page.getByRole('region', { name: /PI-002 Painéis Elétricos/ })).toBeVisible();
});

test('Novo Projeto: sair do projeto atual e voltar à tela inicial sem digitar APAGAR', async ({ page }) => {
  await importReferenceProject(page);
  await page.getByRole('button', { name: /Novo Projeto/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Começar um novo projeto?' });
  await expect(dialog.getByRole('button', { name: 'Exportar o atual' })).toBeVisible();
  // Fora do <header> (portal no body): overlay cobre a janela e o diálogo fica centralizado, inteiro.
  expect(await dialog.evaluate((el) => !!el.closest('header'))).toBe(false);
  const vp = page.viewportSize()!;
  expect(await page.locator('.dialog-backdrop').boundingBox()).toEqual({ x: 0, y: 0, width: vp.width, height: vp.height });
  await expect(page.locator('.dialog-backdrop')).toHaveCSS('z-index', '1000');
  const box = (await dialog.boundingBox())!;
  expect(box.height).toBeGreaterThan(180);
  expect(box.y).toBeGreaterThan(0);
  expect(box.y + box.height).toBeLessThan(vp.height);
  expect(Math.abs(box.y + box.height / 2 - vp.height / 2)).toBeLessThan(2);
  await expect(dialog.getByRole('textbox')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Apagar e começar novo' }).click();
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  expect(dbs).not.toContain('pmb');
});

test('Layout: 7 abas sem rolagem horizontal da página em 380 e 1440 px', async ({ page }) => {
  await importReferenceProject(page);
  for (const width of [380, 1440]) {
    await page.setViewportSize({ width, height: 800 });
    await go(page, '/projeto/finances/resumo');
    await expect(page.getByRole('heading', { name: 'Resumo financeiro' })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `largura ${width}`).toBe(0);
  }
});
