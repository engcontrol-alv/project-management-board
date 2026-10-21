import { describe, expect, it } from 'vitest';
import { aContext } from '@/test/builders';
import { buildContext, computeDashboard } from '@/analytics/dashboard';
import { supplierPanel } from '@/analytics/supplier-panel';
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
    expect(dash.perModule.map((m) => m.id)).toHaveLength(7);
    expect(dash.perModule.filter((m) => m.rag === 'n/a')).toEqual([]);
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

  it('os 7 domínios cruzados: EVM, alertas, riscos nas 4 faixas, sobrecarga e fornecedor', () => {
    const s = buildDemoSnapshot(ctx);
    const c = buildContext(s, TODAY);
    const f = c.derived.finances!;
    expect(Object.keys(s.baselines[0]!.costItems).length).toBeGreaterThan(5);
    expect(f.evm.cpi).not.toBeNull();
    expect(f.evm.cpi!).toBeLessThan(1);
    expect(f.evm.cpi!).toBeGreaterThan(0.85);
    expect(f.evm.spi!).toBeLessThan(1);
    const messages = computeDashboard(c).alerts.map((a) => a.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        'Entrega de CTR-001 ameaça o marco M-004',
        'CTR-002 comprometido acima do orçado',
        'Reserva de contingência insuficiente',
        'Fornecedor PI-009 com comprometido acima do limite sem acompanhamento',
      ]),
    );
    const bands = Object.values(s.risks.risks).map((r) => r.probability! * r.impact!);
    expect(new Set(bands.map((b) => (b <= 2 ? 'Baixo' : b <= 4 ? 'Moderado' : b <= 6 ? 'Alto' : 'Crítico')))).toEqual(
      new Set(['Baixo', 'Moderado', 'Alto', 'Crítico']),
    );
    expect(c.derived.resources!.peakPct!).toBeGreaterThan(100);
    const panels = Object.values(s.stakeholders.parties).find((p) => p.code === 'PI-002')!;
    const panel = supplierPanel(s, c.derived, panels.id);
    expect(panel.procurements.length).toBeGreaterThan(0);
    expect(panel.risks.length).toBeGreaterThan(0);
    expect(Object.values(s.stakeholders.parties).filter((p) => p.analysis)).toHaveLength(6);
  });

  it('Etapa 3: TAF/TAC nos entregáveis físicos e multa contratual pelos marcos contratuais atrasados', () => {
    const s = buildDemoSnapshot(ctx);
    const c = buildContext(s, TODAY);
    const physical = Object.values(s.scope.deliverables).filter((d) => d.category === 'Entregável físico / serviço');
    expect(physical.map((d) => [d.code, d.type, d.fatStatus, d.satStatus])).toEqual([
      ['ENT-007', 'Painel/Sistema', 'Pendente', 'Pendente'],
      ['ENT-008', 'Treinamento', 'Não Aplicável', 'Não Aplicável'],
      ['ENT-009', 'Software de CLP/IHM', 'Aprovado com Ressalvas', 'Reprovado'],
    ]);
    const alerts = computeDashboard(c).alerts;
    expect(alerts.find((a) => a.message === 'ENT-009 aceito pelo cliente com TAC/SAT Reprovado')?.severity).toBe('vermelho');
    const p = c.derived.penalty!;
    expect(p.clauseText).toBe('0,1% por dia sobre o valor do contrato · teto 10%');
    // M-002 já venceu na data de status; o atraso se propaga pelo caminho crítico até M-005 (atraso previsto).
    expect(p.items.map((i) => i.code)).toEqual(['M-002', 'M-005']);
    expect(p.items.every((i) => i.delayDays > 0)).toBe(true);
    expect(p.totalCents).toBe(p.items.reduce((sum, i) => sum + i.delayDays, 0) * 150_000);
    expect(p.capped).toBe(false);
  });

  it('a mudança aprovada pode ser aplicada à linha de base', () => {
    const s = buildDemoSnapshot(ctx);
    const approved = Object.values(s.scope.changeRequests).find((c) => c.status === 'Aprovada')!;
    const r = runCommand(s, applyChangeToBaseline(approved.id), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.snapshot.baselines).toHaveLength(2);
  });
});
