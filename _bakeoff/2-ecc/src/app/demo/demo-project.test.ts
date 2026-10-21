import { analysisContext } from '@/analytics/context';
import { computeDashboard } from '@/analytics/dashboard';
import { effectiveStatusDate } from '@/analytics/derive';
import { parseExport, toExport } from '@/project/serialization';
import { buildDemoSnapshot } from './demo-project';

const TODAY = '2026-10-18';
let seq = 0;
const ctx = (today = TODAY) => ({ now: `${today}T12:00:00.000Z`, today, newId: () => `demo-${++seq}` });

describe('projeto de demonstração', () => {
  const s = buildDemoSnapshot(ctx());
  const analysis = analysisContext(s, effectiveStatusDate(s.project, TODAY));
  const d = computeDashboard(analysis);

  it('é um snapshot válido: sobrevive à exportação e reimportação', () => {
    const r = parseExport(toExport(s, ctx().now));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toEqual(s);
  });

  it('preenche todos os cadastros e acompanha a data de hoje', () => {
    expect(s.project.statusDate).toBeNull();
    expect(Object.keys(s.stakeholders.parties).length).toBeGreaterThanOrEqual(6);
    expect(Object.keys(s.scope.requirements).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(s.scope.wbs).length).toBeGreaterThanOrEqual(15);
    expect(Object.keys(s.scope.deliverables).length).toBeGreaterThanOrEqual(8);
    expect(Object.keys(s.scope.changeRequests).length).toBeGreaterThanOrEqual(2);
    expect(Object.keys(s.schedule.milestones).length).toBeGreaterThanOrEqual(5);
    expect(Object.keys(s.governance.norms).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(s.governance.meetings).length).toBeGreaterThanOrEqual(3);
    expect(Object.keys(s.governance.lessons).length).toBeGreaterThanOrEqual(2);
    expect(s.governance.profile.charter.status).toBe('Em execução');
  });

  it('tem linha de base revisada por mudança aprovada', () => {
    expect(s.baselines.map((b) => b.version)).toEqual([1, 2]);
    const cr = s.scope.changeRequests[s.baselines[1]!.changeRequestId as never];
    expect(cr?.status).toBe('Implementada');
  });

  it('alimenta Gantt, Curva S, caminho crítico e indicadores', () => {
    expect(analysis.derived.schedule.ok).toBe(true);
    if (!analysis.derived.schedule.ok) return;
    expect(Object.values(analysis.derived.schedule.tasks).some((t) => t.critical)).toBe(true);
    expect(analysis.derived.sCurve.length).toBeGreaterThan(5);
    expect(analysis.derived.progress.actual).toBeGreaterThan(0);
    expect(analysis.derived.progress.spi).not.toBeNull();
    expect(d.kpis.length).toBeGreaterThan(0);
    expect(d.overall).not.toBe('n/a');
  });

  it('representa um contrato de engenharia e automação industrial por fases', () => {
    const wbs = Object.values(s.scope.wbs);
    expect(wbs.filter((w) => w.parentId === null).map((w) => w.name)).toEqual([
      'Planejamento',
      'Engenharia',
      'Suprimentos',
      'Montagem',
      'Comissionamento',
    ]);
    const deliverables = Object.values(s.scope.deliverables).map((d) => d.name);
    expect(deliverables.some((n) => n.includes('TAF/FAT'))).toBe(true);
    expect(deliverables.some((n) => n.includes('TAC/SAT'))).toBe(true);
  });

  it('mostra alertas realistas', () => {
    const ids = d.alerts.map((a) => a.id.split(':')[0]);
    expect(ids).toContain('milestone-deviation');
    expect(ids).toContain('stale-change-request');
    expect(ids).toContain('deliverable-overdue');
  });

  it('funciona em qualquer data (datas relativas a hoje)', () => {
    expect(() => buildDemoSnapshot(ctx('2026-01-05'))).not.toThrow();
  });
});
