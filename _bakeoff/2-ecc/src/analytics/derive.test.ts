import { currentBaseline, deriveProject, effectiveStatusDate } from './derive';
import { snapshotBaseline } from './baseline-snapshot';
import { aProject, aSnapshot, docDeliverable, group, milestone, NOW, pkg, START } from '@/test/builders';

const base = () =>
  aSnapshot()
    .wbs(group('G'), pkg('A', 5, [], { parentId: 'G' as never }))
    .milestones(milestone('M', ['A']))
    .deliverables(docDeliverable('D', { plannedDate: '2026-02-01' }))
    .build();

describe('deriveProject', () => {
  it('sem LB: datas calculadas, sem desvio, SPI e Curva S n/a', () => {
    const d = deriveProject(base(), START);
    expect(d.statusDate).toBe(START);
    expect(d.schedule.ok && d.schedule.tasks.A?.finish).toBe('2026-01-09');
    expect(d.groups.G).toMatchObject({ start: '2026-01-05', finish: '2026-01-09', percent: 0 });
    expect(d.milestones.M).toMatchObject({ forecast: '2026-01-09', baselineDate: null, deviationDays: null, critical: true });
    expect(d.progress).toEqual({ actual: 0, planned: null, spi: null });
    expect(d.sCurve).toEqual([]);
  });

  it('com LB e pacote alongado: desvio, Atenção e crítico', () => {
    const s = base();
    const bl = snapshotBaseline(s, deriveProject(s, START), { id: 'b1', now: NOW, changeRequestId: null });
    s.baselines.push(bl);
    s.scope.wbs['A' as never] = pkg('A', 8, [], { parentId: 'G' as never });
    const d = deriveProject(s, START);
    expect(d.milestones.M).toEqual({
      forecast: '2026-01-12',
      baselineDate: '2026-01-09',
      deviationDays: 3,
      status: 'Atenção',
      critical: true,
    });
    expect(d.progress.planned).toBe(20);
    expect(d.progress.spi).toBe(0);
    expect(d.sCurve.length).toBeGreaterThan(0);
  });

  it('ciclo não lança e deixa previsão nula', () => {
    const s = aSnapshot()
      .wbs(pkg('A', 1, ['B']), pkg('B', 1, ['A']))
      .milestones(milestone('M', ['A']))
      .build();
    const d = deriveProject(s, START);
    expect(d.schedule.ok).toBe(false);
    expect(d.milestones.M?.forecast).toBeNull();
  });
});

describe('snapshotBaseline', () => {
  it('fotografa pacotes, marcos com previsão e entregáveis', () => {
    const s = base();
    const bl = snapshotBaseline(s, deriveProject(s, START), { id: 'b1', now: NOW, changeRequestId: null });
    expect(bl).toMatchObject({ id: 'b1', projectId: 'proj-1', version: 1, createdAt: NOW, changeRequestId: null });
    expect(bl.workPackages).toEqual({ A: { start: '2026-01-05', finish: '2026-01-09', duration: 5 } });
    expect(bl.milestones).toEqual({ M: { date: '2026-01-09' } });
    expect(bl.deliverables.D).toEqual({ code: 'ENT-D', name: 'Entregável D', plannedDate: '2026-02-01' });
    expect(bl.projectFinish).toBe('2026-01-09');
    expect(bl.costItems).toEqual({});
  });
});

describe('helpers', () => {
  it('effectiveStatusDate e currentBaseline', () => {
    expect(effectiveStatusDate(aProject({ statusDate: null }), '2026-10-17')).toBe('2026-10-17');
    expect(effectiveStatusDate(aProject({ statusDate: '2026-02-01' }), '2026-10-17')).toBe('2026-02-01');
    const s = base();
    expect(currentBaseline(s)).toBeNull();
    s.baselines.push({ version: 1 } as never, { version: 2 } as never);
    expect(currentBaseline(s)?.version).toBe(2);
  });
});
