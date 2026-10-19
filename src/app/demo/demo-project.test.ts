import { describe, expect, it } from 'vitest';
import { aContext } from '@/test/builders';
import { buildContext, computeDashboard } from '@/analytics/dashboard';
import { applyChangeToBaseline } from '@/commands/baseline';
import { runCommand } from '@/commands/run';
import { parseImportText, toExport } from '@/project/serialization';
import { buildDemoSnapshot } from './demo-project';

const TODAY = '2026-10-18';
const ctx = aContext({ today: TODAY, now: `${TODAY}T12:00:00.000Z` });

describe('projeto de demonstração', () => {
  it('é válido (schemas e integridade) e sobrevive ao round-trip', () => {
    const s = buildDemoSnapshot(ctx);
    const r = parseImportText(JSON.stringify(toExport(s, ctx.now)));
    expect(r.ok ? [] : r.error.message).toEqual([]);
    if (r.ok) expect(r.value.snapshot).toEqual(s);
  });

  it('preenche cronograma, LB, Curva S, caminho crítico e alertas', () => {
    const s = buildDemoSnapshot(ctx);
    const c = buildContext(s, TODAY);
    expect(c.derived.schedule.ok).toBe(true);
    expect(s.baselines).toHaveLength(1);
    expect(c.derived.sCurve.length).toBeGreaterThan(5);
    expect(c.derived.progress.spi).not.toBeNull();
    const tasks = c.derived.schedule.ok ? Object.values(c.derived.schedule.tasks) : [];
    expect(tasks.filter((t) => t.critical).length).toBeGreaterThan(3);
    const dash = computeDashboard(c);
    expect(dash.alerts.length).toBeGreaterThan(0);
    expect(dash.perModule.every((m) => m.id === 'stakeholders' || m.rag !== 'n/a')).toBe(true);
    // O atraso de 4 dias no unifilar aparece como desvio dos marcos dependentes.
    expect(Object.values(c.derived.milestones).some((m) => (m.deviationDays ?? 0) > 0)).toBe(true);
  });

  it('representa um contrato de automação industrial com TAF/FAT e TAC/SAT', () => {
    const s = buildDemoSnapshot(ctx);
    const c = buildContext(s, TODAY);
    expect(c.config.settings.schedule.phases).toEqual(['Planejamento', 'Engenharia', 'Suprimentos', 'Montagem', 'Comissionamento']);
    const groups = Object.values(s.scope.wbs).filter((n) => n.kind === 'Agrupador').map((n) => n.phase);
    expect(groups).toEqual(['Planejamento', 'Engenharia', 'Suprimentos', 'Montagem', 'Comissionamento']);
    const names = Object.values(s.scope.deliverables).map((d) => d.name).join(' | ');
    expect(names).toMatch(/TAF\/FAT/);
    expect(names).toMatch(/TAC\/SAT/);
  });

  it('a mudança aprovada pode ser aplicada à linha de base', () => {
    const s = buildDemoSnapshot(ctx);
    const approved = Object.values(s.scope.changeRequests).find((c) => c.status === 'Aprovada')!;
    const r = runCommand(s, applyChangeToBaseline(approved.id), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.snapshot.baselines).toHaveLength(2);
  });
});
