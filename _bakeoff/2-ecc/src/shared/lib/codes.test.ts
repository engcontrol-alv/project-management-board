import { formatCode, nextWbsCode } from './codes';

describe('codes', () => {
  it('formatCode', () => {
    expect(formatCode('MUD', 3)).toBe('MUD-003');
    expect(formatCode('M', 1234)).toBe('M-1234');
  });
  it('nextWbsCode', () => {
    expect(nextWbsCode([], null)).toBe('1');
    expect(nextWbsCode(['1', '2'], null)).toBe('3');
    expect(nextWbsCode(['1.2.1'], '1.2')).toBe('1.2.2');
    expect(nextWbsCode([], '1.2')).toBe('1.2.1');
    expect(nextWbsCode(['1', '10', '2'], null)).toBe('11');
  });
});
