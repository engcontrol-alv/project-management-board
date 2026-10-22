import { expect, test } from '@playwright/test';

test('Guia de Preenchimento: projeto novo 0/5, atalho abre a aba, ocultar persiste e não sai no relatório A4', async ({ page }) => {
  await page.addInitScript(() => {
    window.print = () => {};
  });
  await page.goto('/');
  await page.getByLabel('Nome').fill('Projeto Guia');
  await page.getByLabel('Código').fill('GUIA-01');
  await page.getByLabel('Data de início').fill('2026-01-05');
  await page.getByRole('button', { name: 'Criar projeto' }).click();
  await expect(page.getByText('Painel executivo')).toBeVisible();

  const guide = page.getByRole('region', { name: 'Guia de Preenchimento do Projeto' });
  await expect(guide).toContainText('0/5 passos iniciais concluídos');
  await expect(guide.locator('strong')).toHaveText([
    'Governança',
    'Escopo',
    'Cronograma',
    'Finanças',
    'Riscos',
    'Rotina de Atualização',
  ]);
  await expect(guide.getByRole('img', { name: 'Pendente' })).toHaveCount(5);

  await guide.getByRole('link', { name: 'Abrir Riscos →' }).click();
  await expect(page).toHaveURL(/#\/projeto\/risks\/registro$/);
  await page.goBack();

  await page.getByRole('button', { name: 'Ocultar guia' }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Painel executivo')).toBeVisible();
  const reopen = page.getByRole('button', { name: /Guia de Preenchimento/ });
  await expect(reopen).toContainText('0/5 passos iniciais concluídos');
  await expect(guide).toHaveCount(0);
  await reopen.click();
  await expect(guide).toBeVisible();

  await page.getByRole('button', { name: /Imprimir A4/ }).click();
  await page.getByRole('dialog', { name: 'Relatório executivo A4' }).getByRole('button', { name: 'Gerar e Imprimir A4' }).click();
  const report = page.getByRole('article', { name: 'Relatório executivo A4' });
  await expect(report).toBeVisible();
  await expect(report).not.toContainText(/Guia de Preenchimento|passos iniciais/);
});
