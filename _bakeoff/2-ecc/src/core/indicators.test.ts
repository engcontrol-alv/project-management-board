import { worstRag } from './indicators';

describe('worstRag', () => {
  it('escolhe o pior ignorando n/a', () => {
    expect(worstRag(['verde', 'amarelo'])).toBe('amarelo');
    expect(worstRag(['verde', 'n/a', 'vermelho'])).toBe('vermelho');
    expect(worstRag(['n/a', 'n/a'])).toBe('n/a');
    expect(worstRag([])).toBe('n/a');
    expect(worstRag(['n/a', 'verde'])).toBe('verde');
  });
});
