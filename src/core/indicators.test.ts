import { describe, expect, it } from 'vitest';
import { worstRag } from './indicators';
import { readPath } from './module-contract';

describe('worstRag', () => {
  it('escolhe o pior e ignora n/a', () => {
    expect(worstRag(['verde', 'amarelo'])).toBe('amarelo');
    expect(worstRag(['verde', 'n/a', 'vermelho'])).toBe('vermelho');
    expect(worstRag(['n/a', 'n/a'])).toBe('n/a');
    expect(worstRag([])).toBe('n/a');
    expect(worstRag(['n/a', 'verde'])).toBe('verde');
  });
});

describe('readPath', () => {
  it('lê caminhos com ponto', () => {
    expect(readPath({ charter: { clientId: 'x' } }, 'charter.clientId')).toBe('x');
    expect(readPath({ charter: null }, 'charter.clientId')).toBeUndefined();
  });
});
