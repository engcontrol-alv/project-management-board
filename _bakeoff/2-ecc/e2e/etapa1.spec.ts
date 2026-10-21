import { expect, test, type Page } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function dbNames(page: Page): Promise<string[]> {
  return page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name ?? ''));
}

async function createProject(page: Page, name = 'Projeto E2E', code = 'E2E-01') {
  await page.goto('/');
  await page.getByLabel('Nome do projeto').fill(name);
  await page.getByLabel('Código (até 12 caracteres)').fill(code);
  await page.getByLabel('Data de início').fill('2026-01-05');
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByLabel('Data de status').fill('2026-01-05');
}

async function go(page: Page, hash: string) {
  await page.goto(`/#${hash}`);
}

async function save(page: Page) {
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toHaveCount(0);
}

async function addPerson(page: Page, name: string) {
  await go(page, '/projeto/pessoas');
  await page.getByRole('button', { name: 'Novo' }).click();
  await page.getByRole('dialog').getByLabel('Nome').fill(name);
  await save(page);
}

async function addPackage(page: Page, name: string, duration: number, predecessors: string[] = []) {
  await go(page, '/projeto/scope/eap');
  await page.getByRole('button', { name: 'Novo' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Duração (dias corridos)').fill(String(duration));
  for (const p of predecessors) await dialog.getByRole('group', { name: 'Predecessores' }).getByLabel(p).check();
  await save(page);
}

async function addMilestone(page: Page, name: string, predecessors: string[]) {
  await go(page, '/projeto/schedule/marcos');
  await page.getByRole('button', { name: 'Novo' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill(name);
  for (const p of predecessors) await dialog.getByRole('group', { name: 'Predecessores' }).getByLabel(p).check();
  await save(page);
}

async function addDeliverable(page: Page, name: string) {
  await go(page, '/projeto/scope/entregaveis');
  await page.getByRole('button', { name: 'Novo' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill(name);
  await dialog.getByLabel('Categoria').selectOption('Documentação de engenharia');
  await dialog.getByLabel('Tipo').selectOption('Memorial descritivo');
  await dialog.getByLabel('Status').selectOption('Em elaboração');
  await save(page);
}

async function eraseAll(page: Page) {
  await go(page, '/projeto/configuracao');
  await page.getByRole('button', { name: 'Apagar dados locais' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Digite APAGAR para confirmar').fill('APAGAR');
  await dialog.getByRole('button', { name: 'Confirmar' }).click();
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
}

test('Critério 1: navegador limpo mostra a tela inicial e não cria o banco', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Criar projeto' })).toBeVisible();
  await expect(page.getByLabel('Importar projeto')).toBeVisible();
  expect(await dbNames(page)).not.toContain('pmb');
});

test('Critério 2: exportar, apagar e reimportar preserva registros e códigos', async ({ page }) => {
  await createProject(page);
  await addPerson(page, 'Ana Teste');
  await addPackage(page, 'Projeto básico', 5);
  await addPackage(page, 'Montagem', 3, ['1 Projeto básico']);
  await addMilestone(page, 'Entrega final', ['2 Montagem']);
  await addDeliverable(page, 'Memorial do sistema');

  await go(page, '/projeto/configuracao');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^pmb-e2e-01-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  await eraseAll(page);
  await page.getByLabel('Importar projeto').setInputFiles(file);
  await expect(page.getByText('Projeto E2E', { exact: true })).toBeVisible();

  await go(page, '/projeto/pessoas');
  await expect(page.getByRole('cell', { name: 'PI-001', exact: true })).toBeVisible();
  await go(page, '/projeto/scope/eap');
  await expect(page.getByRole('cell', { name: 'Montagem', exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: '2', exact: true })).toBeVisible();
  await go(page, '/projeto/schedule/marcos');
  await expect(page.getByRole('cell', { name: 'M-001', exact: true })).toBeVisible();
  await go(page, '/projeto/scope/entregaveis');
  await expect(page.getByRole('cell', { name: 'ENT-001', exact: true })).toBeVisible();
});

test('Critério 3: importação inválida é recusada e o projeto atual fica intacto', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/configuracao');
  await page.getByLabel('Importar arquivo').setInputFiles(fixture('projeto-invalido.json'));
  await expect(page.getByRole('alert')).toContainText('O arquivo contém dados inválidos:');
  await expect(page.getByRole('alert')).toContainText('REQ-001');
  await page.reload();
  await expect(page.getByText('Projeto E2E', { exact: true })).toBeVisible();
});

test('Importar fixture válida na tela inicial', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Importar projeto').setInputFiles(fixture('projeto-valido.json'));
  await expect(page.getByText('Projeto Fixture', { exact: true })).toBeVisible();
});

test('Critérios 5 e 6: atraso crítico alerta a Governança; LB só muda por mudança aprovada', async ({ page }) => {
  await createProject(page);
  await addPerson(page, 'Ana Aprovadora');
  await addPackage(page, 'A', 5);
  await addPackage(page, 'B', 3, ['1 A']);
  await addMilestone(page, 'Marco após B', ['2 B']);

  await go(page, '/projeto/governance/painel');
  await page.getByRole('button', { name: 'Definir linha de base' }).click();
  await expect(page.getByText('Linha de base v1')).toBeVisible();

  await go(page, '/projeto/scope/eap');
  await page.getByRole('button', { name: 'Editar 1' }).click();
  await page.getByRole('dialog').getByLabel('Duração (dias corridos)').fill('10');
  await save(page);

  await go(page, '/projeto/governance/painel');
  await expect(page.getByTestId('rag-schedule')).toContainText('Vermelho');
  const alert = page.getByText('Marco M-001 previsto 5 dias após a linha de base — considerar solicitação de mudança');
  await expect(alert).toBeVisible();
  await expect(page.getByText('Linha de base v1')).toBeVisible();

  await page.getByRole('link', { name: 'Abrir solicitação de mudança' }).click();
  await page.getByRole('dialog').getByLabel('Título').fill('Replanejamento do pacote A');
  await save(page);
  await page.getByRole('button', { name: 'Enviar para análise MUD-001' }).click();
  await page.getByRole('button', { name: 'Aprovar MUD-001' }).click();
  const decision = page.getByRole('dialog', { name: 'Aprovar MUD-001' });
  await decision.getByLabel('Aprovador').selectOption({ label: 'PI-001 Ana Aprovadora' });
  await decision.getByRole('button', { name: 'Confirmar' }).click();
  await page.getByRole('button', { name: 'Aplicar à linha de base' }).click();
  await expect(page.getByRole('cell', { name: 'Implementada', exact: true })).toBeVisible();

  await go(page, '/projeto/governance/painel');
  await expect(page.getByText('Linha de base v2')).toBeVisible();
  await expect(alert).toHaveCount(0);
  await expect(page.getByText(/^v1 — /)).toBeVisible();
});

test('Critério 10: apagar dados locais esvazia o IndexedDB', async ({ page }) => {
  await createProject(page);
  expect(await dbNames(page)).toContain('pmb');
  await eraseAll(page);
  expect(await dbNames(page)).not.toContain('pmb');
});

test('Critério 11: Governança mostra normas, template e estratégia, sem Processos', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/governance/normas');
  await page.getByRole('button', { name: 'Novo' }).click();
  await page.getByRole('dialog').getByLabel('Código da norma').fill('NR-10');
  await save(page);
  await go(page, '/projeto/governance/documentacao-aquisicoes');
  await page.getByLabel('Template de documentação').selectOption('Externo (cliente)');
  await page.getByLabel('Modalidade').selectOption('Concorrência');
  await page.getByLabel('Faturamento').selectOption('Direto ao cliente');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Salvo.')).toBeVisible();
  await go(page, '/projeto/governance/painel');
  const defs = page.getByTestId('definitions');
  await expect(defs).toContainText('NR-10');
  await expect(defs).toContainText('Externo (cliente)');
  await expect(defs).toContainText('Concorrência');
  await expect(defs).toContainText('Direto ao cliente');
  expect(await page.content()).not.toMatch(/Processo/);
});

test('Critério 12: entregável exige categoria; documentação herda o template', async ({ page }) => {
  await createProject(page);
  await go(page, '/projeto/governance/documentacao-aquisicoes');
  await page.getByLabel('Template de documentação').selectOption('Externo (cliente)');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Salvo.')).toBeVisible();

  await go(page, '/projeto/scope/entregaveis');
  await page.getByRole('button', { name: 'Novo' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Nome').fill('Sem categoria');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog.getByRole('alert')).toContainText('Categoria');
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await addDeliverable(page, 'Memorial descritivo geral');
  const row = page.getByRole('row', { name: /ENT-001/ });
  await expect(row.locator('em')).toHaveText('Externo (cliente)');
});

test('Dados persistem após recarregar', async ({ page }) => {
  await createProject(page);
  await addPackage(page, 'Pacote persistente', 4);
  await page.reload();
  await expect(page.getByRole('cell', { name: 'Pacote persistente', exact: true })).toBeVisible();
});
