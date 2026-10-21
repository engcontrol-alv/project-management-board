import { expect, type Locator, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { toExport } from '../src/project/serialization';
import { buildDemoSnapshot } from '../src/test/demo-project';

/** Hoje no fuso dos testes (playwright.config: America/Sao_Paulo), como o relógio do app. */
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());

/**
 * O app não tem projeto demo: o projeto de referência (cronograma em andamento, 7 domínios)
 * é gerado para "hoje" e importado pela tela inicial como um JSON exportado pelo usuário.
 */
export async function importReferenceProject(page: Page) {
  const now = new Date().toISOString();
  const snapshot = buildDemoSnapshot({ now, today: today(), newId: randomUUID });
  await page.goto('/');
  await page.locator('#start-import').setInputFiles({
    name: 'projeto-referencia.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(toExport(snapshot, now))),
  });
  await expect(page.getByText('Painel executivo')).toBeVisible();
}

/** Card de um domínio no semáforo da aba Geral, pelo nome do domínio. */
export function domainCard(page: Page, label: string): Locator {
  return page
    .getByRole('list', { name: 'Semáforo dos domínios' })
    .getByRole('link')
    .filter({ has: page.locator('strong', { hasText: new RegExp(`^${label}$`) }) });
}

/** Bolinha de situação (sem texto visível; o nome da cor fica no aria-label). */
export const situationDot = (scope: Locator, rag: 'Verde' | 'Amarelo' | 'Vermelho' | 'Sem dados') =>
  scope.getByRole('img', { name: `Situação: ${rag}` });
