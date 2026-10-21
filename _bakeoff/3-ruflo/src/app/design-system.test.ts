import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (p: string) => readFileSync(resolve(process.cwd(), p), 'utf8');

describe('design system único: Vercel Geist', () => {
  const tokens = read('src/shared/theme/tokens.css');
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(tokens)?.[1] ?? '';

  it('tokens Geist são as variáveis principais em :root', () => {
    for (const decl of [
      '--ink: #0a0a0a;',
      '--paper: #fafafa;',
      '--surface: #ffffff;',
      '--paper-line: #e5e5e5;',
      '--navy: #0a0a0a;',
      '--radius: 6px;',
      "--font-ui: 'Geist',",
      "--font-mono: 'Geist Mono',",
    ])
      expect(root).toContain(decl);
  });

  it('sem variantes: nenhum seletor data-design-variant nem variants.css', () => {
    expect(tokens).not.toContain('data-design-variant');
    expect(existsSync(resolve(process.cwd(), 'src/shared/theme/variants.css'))).toBe(false);
    expect(read('src/app/main.tsx')).not.toMatch(/variants\.css|design-variant|@fontsource/);
  });

  it('index.html carrega só Geist e Geist Mono, sem bloquear a renderização', () => {
    const html = read('index.html');
    const link = /<link[^>]+href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"[^>]*>/.exec(html);
    expect(link).not.toBeNull();
    const families = [...link![1]!.matchAll(/family=([^:&]+)/g)].map((m) => m[1]);
    expect(families).toEqual(['Geist', 'Geist+Mono']);
    expect(link![0]).toContain('media="print"');
  });
});
