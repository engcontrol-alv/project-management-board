import { computeSchedule, rollupGroups, type CpmTask } from './cpm';

const START = '2026-01-05';
const t = (id: string, duration: number, predecessorIds: string[] = [], extra: Partial<CpmTask> = {}): CpmTask => ({
  id,
  duration,
  predecessorIds,
  startNoEarlierThan: null,
  actualStart: null,
  actualFinish: null,
  percentComplete: 0,
  ...extra,
});
const base = () => [t('A', 5), t('B', 3, ['A']), t('C', 2, ['A']), t('D', 1, ['B', 'C'])];

function ok(r: ReturnType<typeof computeSchedule>) {
  if (!r.ok) throw new Error('esperava ok');
  return r;
}

describe('computeSchedule', () => {
  it('rede base: datas, folgas e caminho crítico', () => {
    const r = ok(computeSchedule(base(), START, START));
    expect(r.tasks.A).toMatchObject({ start: '2026-01-05', finish: '2026-01-09', critical: true, basis: 'plano' });
    expect(r.tasks.B).toMatchObject({ start: '2026-01-10', finish: '2026-01-12', critical: true });
    expect(r.tasks.C).toMatchObject({ start: '2026-01-10', finish: '2026-01-11', totalFloat: 1, critical: false });
    expect(r.tasks.D).toMatchObject({ start: '2026-01-13', finish: '2026-01-13', critical: true });
    expect(r.projectFinish).toBe('2026-01-13');
  });

  it('não começar antes de', () => {
    const tasks = base();
    tasks[1]!.startNoEarlierThan = '2026-01-15';
    const r = ok(computeSchedule(tasks, START, START));
    expect(r.tasks.B).toMatchObject({ start: '2026-01-15', finish: '2026-01-17' });
    expect(r.tasks.D).toMatchObject({ start: '2026-01-18', finish: '2026-01-18' });
  });

  it('duração 0: término = início; sucessor começa no mesmo dia', () => {
    const r = ok(computeSchedule([t('A', 5), t('M0', 0, ['A']), t('E', 2, ['M0'])], START, START));
    expect(r.tasks.M0).toMatchObject({ start: '2026-01-10', finish: '2026-01-10' });
    expect(r.tasks.E).toMatchObject({ start: '2026-01-10', finish: '2026-01-11' });
  });

  it('datas reais substituem as calculadas', () => {
    const tasks = base();
    tasks[0] = t('A', 5, [], { actualStart: '2026-01-06', actualFinish: '2026-01-12', percentComplete: 100 });
    const r = ok(computeSchedule(tasks, START, START));
    expect(r.tasks.A).toMatchObject({ start: '2026-01-06', finish: '2026-01-12', basis: 'real' });
    expect(r.tasks.B!.start).toBe('2026-01-13');
  });

  it('pacote iniciado e atrasado é reprojetado pelo restante', () => {
    const tasks = base();
    tasks[0] = t('A', 5, [], { actualStart: '2026-01-05', percentComplete: 40 });
    const r = ok(computeSchedule(tasks, START, '2026-01-12'));
    expect(r.tasks.A).toMatchObject({ start: '2026-01-05', finish: '2026-01-14', basis: 'reprojetado' });
    expect(r.tasks.B!.start).toBe('2026-01-15');
  });

  it('pacote não iniciado com início no passado vai para a data de status', () => {
    const r = ok(computeSchedule(base(), START, '2026-01-12'));
    expect(r.tasks.A).toMatchObject({ start: '2026-01-12', finish: '2026-01-16', basis: 'reprojetado' });
  });

  it('ciclo → erro com os pacotes do ciclo', () => {
    const r = computeSchedule([t('A', 1, ['B']), t('B', 1, ['A']), t('C', 1)], START, START);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.cycle).toEqual(expect.arrayContaining(['A', 'B']));
      expect(r.cycle).not.toContain('C');
    }
  });

  it('sem tarefas', () => {
    expect(computeSchedule([], START, START)).toEqual({ ok: true, tasks: {}, projectFinish: null });
  });

  it('ignora predecessor fora da lista', () => {
    const r = ok(computeSchedule([t('A', 2, ['X'])], START, START));
    expect(r.tasks.A!.start).toBe(START);
  });
});

describe('rollupGroups', () => {
  it('agrega datas e % ponderado pela duração', () => {
    const r = computeSchedule(base(), START, START);
    const nodes = [
      { id: 'G', parentId: null, kind: 'Agrupador' as const, duration: 0, percentComplete: 0 },
      { id: 'H', parentId: 'G', kind: 'Agrupador' as const, duration: 0, percentComplete: 0 },
      { id: 'A', parentId: 'G', kind: 'Pacote de trabalho' as const, duration: 5, percentComplete: 100 },
      { id: 'C', parentId: 'G', kind: 'Pacote de trabalho' as const, duration: 2, percentComplete: 0 },
      { id: 'E', parentId: null, kind: 'Agrupador' as const, duration: 0, percentComplete: 0 },
    ];
    const g = rollupGroups(nodes, r);
    expect(g.G!.percent).toBeCloseTo(71.43, 2);
    expect(g.G).toMatchObject({ start: '2026-01-05', finish: '2026-01-11' });
    expect(g.E).toEqual({ start: null, finish: null, percent: null });
    expect(g.H).toEqual({ start: null, finish: null, percent: null });
  });
});
