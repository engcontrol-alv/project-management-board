import { ganttLayout, ganttRange, monthStarts } from './gantt-layout';

describe('ganttLayout', () => {
  it('posição e largura inclusivas', () => {
    const r = ganttLayout({
      rangeStart: '2026-01-05',
      rangeEnd: '2026-01-31',
      pxPerDay: 10,
      bars: [
        { id: 'A', start: '2026-01-10', finish: '2026-01-12' },
        { id: 'M', start: '2026-01-10', finish: '2026-01-10', zero: true },
      ],
    });
    expect(r.A).toEqual({ x: 50, width: 30 });
    expect(r.M).toEqual({ x: 50, width: 0 });
  });
  it('intervalo cobre todas as datas com folga', () => {
    expect(ganttRange(['2026-01-10', '2026-02-03', '2026-01-07'])).toEqual({ start: '2026-01-05', end: '2026-02-10' });
    expect(ganttRange([])).toBeNull();
  });
});

describe('monthStarts', () => {
  it('primeiros dias de cada mês dentro do intervalo, com rótulo', () => {
    expect(monthStarts('2026-01-26', '2026-03-10')).toEqual([
      { date: '2026-02-01', label: 'fev 2026' },
      { date: '2026-03-01', label: 'mar 2026' },
    ]);
  });
  it('vira o ano e inclui o início quando é dia 1', () => {
    expect(monthStarts('2025-12-01', '2026-01-05').map((m) => m.label)).toEqual(['dez 2025', 'jan 2026']);
  });
});
