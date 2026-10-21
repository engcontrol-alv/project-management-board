import { formatPercent, formatRatio } from './format';

describe('format', () => {
  it('formatRatio', () => {
    expect(formatRatio(0.9234)).toBe('0,92');
    expect(formatRatio(null)).toBe('n/a');
    expect(formatRatio(Infinity)).toBe('n/a');
    expect(formatRatio(NaN)).toBe('n/a');
  });
  it('formatPercent', () => {
    expect(formatPercent(45.55)).toBe('45,6%');
    expect(formatPercent(null)).toBe('n/a');
  });
});
