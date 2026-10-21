import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const fixture = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));

async function go(page: Page, path: string) {
  await page.goto(`/#${path}`);
}

async function loadDemo(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Carregar projeto de demonstração' }).click();
  await expect(page.getByText('Painel executivo')).toBeVisible();
}

async function setScale(page: Page, n: 3 | 5) {
  await go(page, '/projeto/configuracao');
  await page.getByLabel('Escala da matriz').selectOption(String(n));
  await page.getByRole('button', { name: 'Salvar parâmetros de Riscos' }).click();
  const dialog = page.getByRole('dialog', { name: `Mudar a matriz para ${n}×${n}?` });
  await expect(dialog).toContainText('Reavaliar');
  await dialog.getByRole('button', { name: `Converter para ${n}×${n}` }).click();
  await expect(page.getByText('Parâmetros salvos.')).toBeVisible();
}

const exposures = (page: Page) => page.getByRole('table').locator('tbody tr').evaluateAll((rows) => rows.map((r) => r.textContent));

test('Matriz de riscos 3×3 → 5×5 → 3×3 pela tela, sem perda de dados', async ({ page }) => {
  await loadDemo(page);
  await go(page, '/projeto/risks/registro');
  await expect(page.getByText('R-001').first()).toBeVisible();
  const before = await exposures(page);

  await setScale(page, 5);
  await go(page, '/projeto/risks/matriz');
  const grid = page.getByRole('grid', { name: 'Matriz probabilidade × impacto' });
  await expect(grid.getByRole('button')).toHaveCount(25);
  await expect(grid.getByRole('row').first()).toContainText('Muito alta');
  await expect(page.getByRole('region', { name: 'Reavaliar' })).toContainText('R-001');
  // Clicar numa célula filtra a tabela; RAG continua com texto.
  const critical = grid.getByRole('button', { name: /Probabilidade Muito alta, impacto Muito alto: [1-9] risco\(s\), Crítico/ });
  await critical.click();
  await expect(critical).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('table', { name: 'Riscos da seleção' })).toContainText('25 · Crítico');

  await setScale(page, 3);
  await go(page, '/projeto/risks/matriz');
  await expect(page.getByRole('grid', { name: 'Matriz probabilidade × impacto' }).getByRole('button')).toHaveCount(9);
  await expect(page.getByRole('region', { name: 'Reavaliar' })).toHaveCount(0);
  await go(page, '/projeto/risks/registro');
  await expect(page.getByText('R-001').first()).toBeVisible();
  expect(await exposures(page)).toEqual(before);
});

test('TAF/FAT e TAC/SAT nos entregáveis e alerta do entregue sem teste aprovado', async ({ page }) => {
  await loadDemo(page);
  await expect(page.getByText('ENT-009 aceito pelo cliente com TAC/SAT Reprovado')).toBeVisible();
  await go(page, '/projeto/scope/entregaveis');
  const row = page.getByRole('row', { name: /ENT-009/ });
  await expect(row).toContainText('TAF Aprovado com Ressalvas');
  await expect(row).toContainText('TAC Reprovado');
  await expect(row).toContainText('Aceito com TAC/SAT Reprovado');
  await expect(page.getByRole('row', { name: /ENT-008/ })).toContainText('Não aplicável');

  // Registrar a aprovação do TAC/SAT tira o alerta.
  await row.getByRole('button', { name: /Editar/ }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('TAC/SAT — status').selectOption('Aprovado');
  await dialog.getByRole('button', { name: 'Salvar' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('row', { name: /ENT-009/ })).toContainText('TAC Aprovado');
  await go(page, '/projeto/geral');
  await expect(page.getByText('Painel executivo')).toBeVisible();
  await expect(page.getByText('ENT-009 aceito pelo cliente com TAC/SAT Reprovado')).toHaveCount(0);
});

test('Multa contratual por atraso: cláusula em Governança, provisão no Resumo e na Geral', async ({ page }) => {
  await loadDemo(page);
  const card = page.getByRole('region', { name: 'Multa contratual por atraso' });
  await expect(card).toContainText('M-002');
  await expect(card).toContainText('0,1% por dia sobre o valor do contrato · teto 10%');
  const geral = (await card.locator('.penalty-value').textContent())!;
  expect(geral).toMatch(/^R\$/);

  await go(page, '/projeto/finances/resumo');
  const kpi = page.locator('.kpi', { hasText: 'Multa por atraso (provisão)' });
  await expect(kpi).toContainText(geral);
  await expect(page.getByRole('region', { name: 'Multa contratual por atraso' }).getByRole('row', { name: /M-002/ })).toBeVisible();

  // Dobrar o percentual dobra a provisão.
  await go(page, '/projeto/governance/contrato');
  const rate = page.getByLabel('Multa por período (%)');
  await expect(rate).toHaveValue('0.1');
  await rate.fill('0.2');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await go(page, '/projeto/finances/resumo');
  const cents = (s: string) => Number(s.replace(/[^\d,]/g, '').replace(',', '.'));
  await expect
    .poll(async () => cents((await kpi.locator('.kpi-value').textContent())!))
    .toBeCloseTo(cents(geral) * 2, 2);
});

test('Backup JSON com SHA-256: exportar → importar verificado; adulterado recusado; antigo aceito', async ({ page }) => {
  await loadDemo(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar', exact: true }).click();
  const text = readFileSync(await (await download).path(), 'utf8');
  const file = JSON.parse(text);
  expect(file.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(file.schemaVersion).toBe(3);

  await page.locator('#data-import').setInputFiles({ name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  const preview = page.getByRole('dialog', { name: 'Substituir o projeto atual?' });
  await expect(preview).toContainText('Integridade verificada (SHA-256)');
  await preview.getByRole('button', { name: 'Cancelar' }).click();

  const tampered = text.replace('"Demonstração — Automação da Linha de Envase 3"', '"Demonstração — Alterada"');
  expect(tampered).not.toBe(text);
  await page.locator('#data-import').setInputFiles({ name: 'adulterado.json', mimeType: 'application/json', buffer: Buffer.from(tampered) });
  const refused = page.getByRole('dialog', { name: 'Importação recusada' });
  await expect(refused).toContainText('Integridade SHA-256 não confere: o arquivo foi alterado ou corrompido depois da exportação.');
  await expect(refused).toContainText('Nenhum dado foi alterado.');
  await refused.getByRole('button', { name: 'Fechar' }).click();
  await expect(page.getByText('Demonstração — Automação da Linha de Envase 3').first()).toBeVisible();

  await page.locator('#data-import').setInputFiles(fixture('projeto-valido.json'));
  await expect(page.getByRole('dialog', { name: 'Substituir o projeto atual?' })).toContainText('Arquivo sem checksum (exportação antiga)');
});
