import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function dbNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ''));
}

async function go(page: Page, path: string) {
  await page.goto(`/#${path}`);
}

async function createProject(page: Page) {
  await page.goto('/');
  await page.getByLabel('Nome').fill('Projeto E2E');
  await page.getByLabel('Código').fill('E2E-01');
  await page.getByLabel('Data de início').fill('2026-01-05');
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.getByText('Painel executivo')).toBeVisible();
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

async function addPerson(page: Page, name: string) {
  await go(page, '/projeto/pessoas');
  const d = await openNew(page);
  await d.getByLabel('Nome / razão social').fill(name);
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
  await expect(page.getByText(name, { exact: true })).toBeVisible();
}

async function addMilestone(page: Page, name: string, pred: string) {
  await go(page, '/projeto/schedule/marcos');
  const d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill(name);
  await d.getByRole('group', { name: 'Predecessores (pacotes)' }).getByLabel(pred).check();
  await save(page);
  await expect(page.getByText(name)).toBeVisible();
}

async function exportProject(page: Page): Promise<Record<string, unknown>> {
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const file = await (await download).path();
  return JSON.parse(readFileSync(file, 'utf8'));
}

async function clearData(page: Page) {
  await go(page, '/projeto/configuracao');
  await page.getByRole('button', { name: 'Apagar dados locais' }).click();
  await page.getByLabel('Digite APAGAR para confirmar').fill('APAGAR');
  await page.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
}

test('Critério 1: navegador limpo mostra criar/importar e não cria banco', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
  await expect(page.getByText('Importar projeto')).toBeVisible();
  expect(await dbNames(page)).not.toContain('pmb');
});

test('Critério 2 e 10: exportar, apagar e reimportar produz dados idênticos', async ({ page }) => {
  await createProject(page);
  await addPerson(page, 'Ana Teste');
  await addPackage(page, 'Pacote A', 5);
  await addPackage(page, 'Pacote B', 3, ['1 Pacote A']);
  await addMilestone(page, 'Marco final', '2 Pacote B');
  await go(page, '/projeto/scope/entregaveis');
  const d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill('Memorial descritivo geral');
  await d.getByLabel('Categoria').selectOption('Documentação de engenharia');
  await d.getByLabel('Tipo').selectOption('Memorial descritivo');
  await save(page);

  const before = await exportProject(page);
  expect(Object.keys(before.data as object)).toContain('scope_wbs');

  await clearData(page);
  expect(await dbNames(page)).not.toContain('pmb');

  await page.locator('#start-import').setInputFiles({
    name: 'projeto.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(before)),
  });
  await expect(page.getByText('Painel executivo')).toBeVisible();
  const after = await exportProject(page);
  expect({ ...after, exportedAt: null }).toEqual({ ...before, exportedAt: null });

  await go(page, '/projeto/scope/entregaveis');
  await expect(page.getByRole('cell', { name: 'ENT-001', exact: true })).toBeVisible();
  await go(page, '/projeto/schedule/marcos');
  await expect(page.getByRole('cell', { name: 'M-001', exact: true })).toBeVisible();
});

test('Critério 3: importação inválida é recusada e o projeto fica intacto', async ({ page }) => {
  await createProject(page);
  await addPackage(page, 'Pacote existente', 4);
  await page.locator('#data-import').setInputFiles(fixture('projeto-invalido.json'));
  const dialog = page.getByRole('dialog', { name: 'Importação recusada' });
  await expect(dialog.getByText(/O arquivo contém dados inválidos:/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('Projeto E2E')).toBeVisible();
  await expect(page.getByText('Pacote existente', { exact: true })).toBeVisible();

  // Arquivo válido com projeto existente pede confirmação antes de substituir.
  await page.locator('#data-import').setInputFiles(fixture('projeto-valido.json'));
  const preview = page.getByRole('dialog', { name: 'Substituir o projeto atual?' });
  await expect(preview.getByText('Exporte o projeto atual antes de substituir.')).toBeVisible();
  await preview.getByRole('button', { name: 'Substituir' }).click();
  await expect(page.getByText('Projeto Importado')).toBeVisible();
});

test('Critérios 5 e 6: atraso crítico gera alerta; LB só muda por mudança aprovada', async ({ page }) => {
  await createProject(page);
  await addPerson(page, 'Ana Teste');
  await addPackage(page, 'Pacote A', 5);
  await addPackage(page, 'Pacote B', 3, ['1 Pacote A']);
  await addMilestone(page, 'Entrega final', '2 Pacote B');
  // Data de status antes do início: o cálculo depende só do plano (sem reprojeção).
  await page.getByLabel('Data de status').fill('2026-01-04');

  await go(page, '/projeto/governance/painel');
  await page.getByRole('button', { name: 'Definir linha de base' }).click();
  await expect(page.getByText('Linha de base v1')).toBeVisible();

  // Atraso de 7 dias (> tolerância de 5) no pacote crítico.
  await go(page, '/projeto/scope/eap');
  await page.getByRole('button', { name: 'Editar 1 Pacote A' }).click();
  await page.getByRole('dialog').getByLabel('Duração (dias corridos)').fill('12');
  await save(page);

  await go(page, '/projeto/governance/painel');
  await expect(page.getByLabel('RAG Cronograma')).toContainText('RAG Vermelho');
  await expect(page.getByText('Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança')).toBeVisible();
  await expect(page.getByText('Linha de base v1')).toBeVisible();

  await page.getByRole('button', { name: 'Abrir solicitação de mudança' }).click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Título').fill('Replanejar pacote A');
  await save(page);
  await page.getByRole('button', { name: 'Em análise MUD-001' }).click();
  await page.getByRole('button', { name: 'Aprovada MUD-001' }).click();
  const decision = page.getByRole('dialog', { name: 'Aprovar MUD-001' });
  await decision.getByLabel('Aprovador').selectOption({ label: 'PI-001 Ana Teste' });
  await decision.getByRole('button', { name: 'Confirmar decisão' }).click();
  await page.getByRole('button', { name: 'Aplicar à linha de base' }).click();
  await expect(page.getByRole('cell', { name: 'Implementada', exact: true })).toBeVisible();

  await go(page, '/projeto/governance/painel');
  await expect(page.getByText('Linha de base v2')).toBeVisible();
  await expect(page.getByText(/Marco M-001 previsto/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar v1' }).click();
  await expect(page.getByLabel('Linha de base v1 (somente leitura)')).toContainText('09/01/2026');
});

test('Critérios 11 e 12: definições da Governança, entregável exige categoria e herda template', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/governance/normas');
  await page.getByRole('button', { name: 'Usar como modelo' }).first().click();
  await save(page);

  await go(page, '/projeto/governance/documentacao-aquisicoes');
  await page.getByLabel('Template de documentação').selectOption('Externo (cliente)');
  await page.getByLabel('Modalidade').selectOption('Concorrência');
  await page.getByLabel('Faturamento').selectOption('Direto ao cliente');
  await expect(page.getByText('Contratações deste projeto não compõem receita própria.')).toBeVisible();
  await page.getByRole('button', { name: 'Salvar' }).click();

  await go(page, '/projeto/governance/painel');
  await expect(page.getByText('ISO 9001:2015')).toBeVisible();
  await expect(page.getByText('Externo (cliente)')).toBeVisible();
  await expect(page.getByText(/Modalidade: Concorrência/)).toBeVisible();
  expect(await page.content()).not.toContain('Processo');

  await go(page, '/projeto/scope/entregaveis');
  let d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill('Sem categoria');
  await d.getByRole('button', { name: 'Salvar' }).click();
  await expect(d.getByRole('alert')).toContainText('Categoria');
  await d.getByRole('button', { name: 'Cancelar' }).click();

  d = await openNew(page);
  await d.getByLabel('Nome', { exact: true }).fill('Diagrama unifilar');
  await d.getByLabel('Categoria').selectOption('Documentação de engenharia');
  await d.getByLabel('Tipo').selectOption('Diagrama (P&ID, unifilar, elétrico)');
  await save(page);
  await expect(page.getByText('Externo (cliente) (herdado)')).toBeVisible();
});

test('dados persistem ao recarregar', async ({ page }) => {
  await createProject(page);
  await addPerson(page, 'Pessoa Persistente');
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Pessoa Persistente', exact: true })).toBeVisible();
  expect(await dbNames(page)).toContain('pmb');
});

test('projeto de demonstração preenche painel, EAP, Gantt e Curva S', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Carregar projeto de demonstração' }).click();
  await expect(page.getByText('Painel executivo')).toBeVisible();
  await expect(page.getByText('Demonstração — Automação da Linha de Envase 3')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir solicitação de mudança' }).first()).toBeVisible();
  await go(page, '/projeto/scope/eap');
  await expect(page.getByText('Crítico').first()).toBeVisible();
  await go(page, '/projeto/schedule/gantt');
  await expect(page.getByRole('img', { name: 'Gráfico de Gantt' })).toBeVisible();
  await go(page, '/projeto/schedule/curva-s');
  await expect(page.locator('.recharts-surface').first()).toBeVisible();
});
