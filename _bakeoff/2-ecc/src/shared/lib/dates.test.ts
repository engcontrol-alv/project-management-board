import { addDays, diffDays, formatDateBR, isIsoDate, maxDate } from './dates';

describe('dates', () => {
  it('addDays atravessa mês, ano bissexto e horário de verão', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-10-18', 1)).toBe('2026-10-19');
    expect(addDays('2026-01-10', -5)).toBe('2026-01-05');
  });
  it('diffDays é to − from', () => {
    expect(diffDays('2026-01-05', '2026-01-14')).toBe(9);
    expect(diffDays('2026-01-14', '2026-01-05')).toBe(-9);
  });
  it('isIsoDate valida formato e calendário', () => {
    expect(isIsoDate('2026-13-01')).toBe(false);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('26-02-28')).toBe(false);
  });
  it('maxDate', () => {
    expect(maxDate('2026-01-05', '2026-03-01', '2026-02-01')).toBe('2026-03-01');
  });
  it('formatDateBR', () => {
    expect(formatDateBR('2026-10-17')).toBe('17/10/2026');
    expect(formatDateBR(null)).toBe('—');
  });
});
