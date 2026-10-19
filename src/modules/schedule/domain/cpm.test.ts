import { describe, expect, it } from 'vitest';
import { computeSchedule, rollupGroups, type CpmTask, type ScheduleResult } from './cpm';

const START = '2026-01-05';

function task(id: string, duration: number, predecessorIds: string[] = [], o: Partial<CpmTask> = {}): CpmTask {
  return {
    id,
    duration,
    predecessorIds,
    startNoEarlierThan: null,
    actualStart: null,
    actualFinish: null,
    percentComplete: 0,
    ...o,
  };
}

const base = () => [task('A', 5), task('B', 3, ['A']), task('C', 2, ['A']), task('D', 1, ['B', 'C'])];

function okTasks(r: ScheduleResult) {
  if (!r.ok) throw new Error('esperava sucesso');
  return r.tasks;
}

describe('computeSchedule', () => {
  it('rede base: datas, folgas e caminho crítico', () => {
    const r = computeSchedule(base(), START, START);
    const t = okTasks(r);
    expect([t.A?.start, t.A?.finish]).toEqual(['2026-01-05', '2026-01-09']);
    expect([t.B?.start, t.B?.finish]).toEqual(['2026-01-10', '2026-01-12']);
    expect([t.C?.start, t.C?.finish, t.C?.totalFloat, t.C?.critical]).toEqual([
      '2026-01-10',
      '2026-01-11',
      1,
      false,
    ]);
    expect([t.D?.start, t.D?.finish]).toEqual(['2026-01-13', '2026-01-13']);
    expect(Object.values(t).filter((x) => x.critical).map((x) => x.id).sort()).toEqual(['A', 'B', 'D']);
    expect(r.ok && r.projectFinish).toBe('2026-01-13');
  });

  it('"não começar antes de"', () => {
    const tasks = base().map((x) => (x.id === 'B' ? { ...x, startNoEarlierThan: '2026-01-15' } : x));
    const t = okTasks(computeSchedule(tasks, START, START));
    expect([t.B?.start, t.B?.finish]).toEqual(['2026-01-15', '2026-01-17']);
    expect([t.D?.start, t.D?.finish]).toEqual(['2026-01-18', '2026-01-18']);
  });

  it('duração 0: término = início e sucessor começa no mesmo dia', () => {
    const t = okTasks(computeSchedule([task('A', 5), task('M0', 0, ['A']), task('E', 2, ['M0'])], START, START));
    expect([t.M0?.start, t.M0?.finish]).toEqual(['2026-01-10', '2026-01-10']);
    expect([t.E?.start, t.E?.finish]).toEqual(['2026-01-10', '2026-01-11']);
  });

  it('datas reais substituem as calculadas', () => {
    const tasks = base().map((x) =>
      x.id === 'A'
        ? { ...x, actualStart: '2026-01-06', actualFinish: '2026-01-12', percentComplete: 100 }
        : x,
    );
    const t = okTasks(computeSchedule(tasks, START, START));
    expect([t.A?.start, t.A?.finish, t.A?.basis]).toEqual(['2026-01-06', '2026-01-12', 'real']);
    expect(t.B?.start).toBe('2026-01-13');
  });

  it('pacote iniciado e atrasado é reprojetado pelo restante proporcional', () => {
    const tasks = base().map((x) =>
      x.id === 'A' ? { ...x, actualStart: '2026-01-05', percentComplete: 40 } : x,
    );
    const t = okTasks(computeSchedule(tasks, START, '2026-01-12'));
    expect([t.A?.finish, t.A?.basis]).toEqual(['2026-01-14', 'reprojetado']);
    expect(t.B?.start).toBe('2026-01-15');
  });

  it('Review Focus 2: pacote não iniciado com início no passado começa na data de status', () => {
    const t = okTasks(computeSchedule(base(), START, '2026-01-12'));
    expect([t.A?.start, t.A?.finish, t.A?.basis]).toEqual(['2026-01-12', '2026-01-16', 'reprojetado']);
  });

  it('ciclo devolve erro com os pacotes do ciclo', () => {
    const r = computeSchedule([task('A', 1, ['B']), task('B', 1, ['A'])], START, START);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.cycle).toEqual(expect.arrayContaining(['A', 'B']));
  });

  it('sem tarefas', () => {
    expect(computeSchedule([], START, START)).toEqual({ ok: true, tasks: {}, projectFinish: null });
  });
});

describe('rollupGroups', () => {
  it('agrega datas e % ponderado pela duração', () => {
    const result = computeSchedule(base(), START, START);
    const nodes = [
      { id: 'G', parentId: null, kind: 'Agrupador' as const, duration: 0, percentComplete: 0 },
      { id: 'E', parentId: null, kind: 'Agrupador' as const, duration: 0, percentComplete: 0 },
      { id: 'A', parentId: 'G', kind: 'Pacote de trabalho' as const, duration: 5, percentComplete: 100 },
      { id: 'C', parentId: 'G', kind: 'Pacote de trabalho' as const, duration: 2, percentComplete: 0 },
    ];
    const g = rollupGroups(nodes, result);
    expect(g.G?.percent).toBeCloseTo(71.43, 2);
    expect(g.G?.start).toBe('2026-01-05');
    expect(g.G?.finish).toBe('2026-01-11');
    expect(g.E).toEqual({ start: null, finish: null, percent: null });
  });
});
