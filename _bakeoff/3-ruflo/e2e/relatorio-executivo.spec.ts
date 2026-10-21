import { expect, test } from '@playwright/test';
import { importReferenceProject } from './support';

test('Relatório executivo A4: compositor → seções + notas → imprime só o relatório, em A4, de qualquer aba', async ({ page }) => {
  // Conta as chamadas de impressão (o diálogo nativo não abre no navegador de teste).
  await page.addInitScript(() => {
    (window as unknown as { __printed: number }).__printed = 0;
    window.print = () => {
      (window as unknown as { __printed: number }).__printed++;
    };
  });
  await importReferenceProject(page);
  await page.goto('/#/projeto/risks/matriz');
  await expect(page.getByRole('grid', { name: 'Matriz probabilidade × impacto' })).toBeVisible();

  await page.getByRole('button', { name: /Imprimir A4/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Relatório executivo A4' });
  expect(await dialog.evaluate((el) => !!el.closest('header'))).toBe(false);
  await expect(dialog.getByRole('button', { name: 'Resumo de Diretoria (1-2 págs)' })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Relatório Técnico Completo' }).click();
  await expect(dialog.getByRole('checkbox')).toHaveCount(7);
  await dialog.getByRole('checkbox', { name: /^Escopo/ }).uncheck();
  await dialog.getByLabel('Observações executivas / notas da emissão').fill('Emissão para a reunião de diretoria.');
  await dialog.getByRole('button', { name: 'Gerar e Imprimir A4' }).click();

  const report = page.getByRole('article', { name: 'Relatório executivo A4' });
  await expect(report).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __printed: number }).__printed)).toBe(1);
  await expect(report.getByRole('heading', { level: 2 })).toHaveText([
    'Resumo executivo',
    'Governança',
    'Cronograma',
    'Custos & Finanças',
    'Riscos',
    'Recursos e Partes Interessadas',
  ]);
  const stamp = report.getByRole('region', { name: 'Carimbo técnico' });
  await expect(stamp).toContainText('DEMO-AUT03');
  await expect(stamp).toContainText('Carla Menezes');
  await expect(report.getByRole('region', { name: 'Observações executivas' })).toContainText('Emissão para a reunião de diretoria.');
  await expect(report.getByRole('img', { name: 'Curva S — PV × EV × AC' })).toBeVisible();

  // Mídia de impressão: só o relatório (sem app, abas, barra ou modais), bolinhas com cor.
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('#root')).toBeHidden();
  await expect(page.getByRole('toolbar', { name: 'Pré-visualização do relatório' })).toBeHidden();
  await expect(report).toBeVisible();
  const dot = stamp.getByRole('img', { name: /^Situação: / });
  await expect(dot).toBeVisible();
  expect(await dot.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');
  await expect(report).not.toContainText(/RAG|Verde|Amarelo|Vermelho/);

  // PDF real na página A4 do @page (595 × 842 pt).
  const pdf = (await page.pdf({ preferCSSPageSize: true })).toString('latin1');
  expect(pdf.startsWith('%PDF')).toBe(true);
  expect(pdf).toMatch(/MediaBox \[0 0 59[45](\.\d+)? 84[12](\.\d+)?\]/);

  await page.emulateMedia({ media: 'screen' });
  await page.getByRole('toolbar', { name: 'Pré-visualização do relatório' }).getByRole('button', { name: 'Fechar' }).click();
  await expect(report).toHaveCount(0);
  await expect(page.getByRole('grid', { name: 'Matriz probabilidade × impacto' })).toBeVisible();
});
