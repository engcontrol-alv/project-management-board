import { computeDashboard } from './dashboard';
import { analysisContext } from './context';
import { snapshotBaseline } from './baseline-snapshot';
import { deriveProject } from './derive';
import { setModuleEnabled } from '@/project/config';
import { aSnapshot, milestone, NOW, pkg, requirement, START } from '@/test/builders';

function scenario() {
  const s = aSnapshot()
    .wbs(pkg('A', 5))
    .milestones(milestone('M', ['A']))
    .requirements(requirement('R', { validationStatus: 'Validado', lastValidation: START, fulfillmentStatus: 'Atendido' }))
    .build();
  s.baselines.push(snapshotBaseline(s, deriveProject(s, START), { id: 'b', now: NOW, changeRequestId: null }));
  s.scope.wbs['A' as never] = pkg('A', 12);
  return s;
}

describe('computeDashboard', () => {
  it('RAG geral é o pior entre os módulos ativos', () => {
    const d = computeDashboard(analysisContext(scenario(), START));
    expect(d.perModule.map((m) => m.id)).toEqual(['governance', 'scope', 'schedule', 'stakeholders']);
    expect(d.perModule.find((m) => m.id === 'scope')?.rag).toBe('verde');
    expect(d.perModule.find((m) => m.id === 'schedule')?.rag).toBe('vermelho');
    expect(d.overall).toBe('vermelho');
    expect(d.kpis.some((k) => k.label === 'SPI físico')).toBe(true);
    expect(d.alerts).toHaveLength(1);
  });
  it('Cronograma desligado sai do RAG, dos KPIs e dos alertas', () => {
    const s = scenario();
    s.project = { ...s.project, config: setModuleEnabled(s.project.config, 'schedule', false) };
    const d = computeDashboard(analysisContext(s, START));
    expect(d.perModule.map((m) => m.id)).not.toContain('schedule');
    expect(d.overall).toBe('verde');
    expect(d.kpis.some((k) => k.label === 'SPI físico')).toBe(false);
    expect(d.alerts).toEqual([]);
  });
});
