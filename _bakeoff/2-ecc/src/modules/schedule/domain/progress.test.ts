import {
  milestoneForecast,
  milestoneIsCritical,
  milestoneStatus,
  physicalProgress,
  physicalSCurve,
  physicalSpi,
  plannedProgress,
} from './progress';
import { computeSchedule } from './cpm';

const task = (id: string, duration: number, predecessorIds: string[] = []) => ({
  id,
  duration,
  predecessorIds,
  startNoEarlierThan: null,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
});

describe('marcos', () => {
  const r = computeSchedule([task('A', 5), task('B', 3, ['A']), task('C', 1, ['A'])], '2026-01-05', '2026-01-05');
  it('previsão = maior término dos predecessores; sem predecessores = data manual', () => {
    expect(milestoneForecast({ predecessorIds: ['A', 'B'], manualDate: null }, r)).toBe('2026-01-12');
    expect(milestoneForecast({ predecessorIds: [], manualDate: '2026-03-01' }, r)).toBe('2026-03-01');
    expect(milestoneForecast({ predecessorIds: ['A'], manualDate: null }, { ok: false, cycle: ['A'] })).toBeNull();
  });
  it('crítico é derivado', () => {
    expect(milestoneIsCritical({ predecessorIds: ['B'] }, r)).toBe(true);
    expect(milestoneIsCritical({ predecessorIds: ['C'] }, r)).toBe(false);
    expect(milestoneIsCritical({ predecessorIds: [] }, r)).toBe(false);
  });
  it('situação', () => {
    const s = { baselineDate: '2026-01-20', statusDate: '2026-01-05', toleranceDays: 5, actualDate: null };
    expect(milestoneStatus({ ...s, actualDate: '2026-01-04', forecast: '2026-01-20' })).toBe('Concluído');
    expect(milestoneStatus({ ...s, forecast: '2026-01-20' })).toBe('No prazo');
    expect(milestoneStatus({ ...s, forecast: '2026-01-25' })).toBe('Atenção');
    expect(milestoneStatus({ ...s, forecast: '2026-01-26' })).toBe('Atrasado');
    expect(
      milestoneStatus({ ...s, baselineDate: null, forecast: '2026-01-10', statusDate: '2026-01-11' }),
    ).toBe('Atrasado');
    expect(milestoneStatus({ ...s, forecast: null })).toBe('No prazo');
  });
});

describe('progresso', () => {
  it('plannedProgress linear na LB', () => {
    const b = { A: { start: '2026-01-05', finish: '2026-01-14', duration: 10 } };
    expect(plannedProgress(b, '2026-01-09')).toBe(50);
    expect(plannedProgress(b, '2026-01-04')).toBe(0);
    expect(plannedProgress(b, '2026-02-01')).toBe(100);
    expect(plannedProgress({}, '2026-01-09')).toBeNull();
  });
  it('physicalProgress ponderado pela duração', () => {
    expect(
      physicalProgress([
        { duration: 10, percentComplete: 50 },
        { duration: 30, percentComplete: 10 },
      ]),
    ).toBe(20);
    expect(physicalProgress([])).toBeNull();
    expect(physicalProgress([{ duration: 0, percentComplete: 100 }])).toBeNull();
  });
  it('physicalSpi nunca é NaN/Infinity', () => {
    expect(physicalSpi(20, 0)).toBeNull();
    expect(physicalSpi(null, 50)).toBeNull();
    expect(physicalSpi(45, 50)).toBe(0.9);
  });
  it('Curva S física', () => {
    expect(physicalSCurve({}, null, '2026-01-05')).toEqual([]);
    const b = { A: { start: '2026-01-05', finish: '2026-01-18', duration: 14 } };
    const pts = physicalSCurve(b, 40, '2026-01-12');
    expect(pts.map((p) => p.date)).toEqual(['2026-01-05', '2026-01-12', '2026-01-18']);
    expect(pts[0]!.planned).toBeCloseTo(7.14, 2);
    expect(pts[1]!.planned).toBeCloseTo(57.14, 2);
    expect(pts[2]!.planned).toBe(100);
    expect(pts.map((p) => p.actual)).toEqual([0, 40, null]);
    const off = physicalSCurve(b, 40, '2026-01-14');
    expect(off.map((p) => p.date)).toEqual(['2026-01-05', '2026-01-12', '2026-01-14', '2026-01-18']);
  });
});
