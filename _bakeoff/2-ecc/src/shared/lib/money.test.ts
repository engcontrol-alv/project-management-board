import { formatMoneyBR, parseMoneyBR } from './money';

describe('money', () => {
  it('parseMoneyBR normaliza para centavos', () => {
    expect(parseMoneyBR('R$ 1.234,56')).toBe(123456);
    expect(parseMoneyBR('-10,5')).toBe(-1050);
    expect(parseMoneyBR('1234')).toBe(123400);
    expect(parseMoneyBR('abc')).toBeNull();
    expect(parseMoneyBR('')).toBeNull();
    expect(parseMoneyBR('1,234')).toBeNull();
  });
  it('formatMoneyBR', () => {
    expect(formatMoneyBR(123456).replace(/\s/g, ' ')).toBe('R$ 1.234,56');
  });
});
