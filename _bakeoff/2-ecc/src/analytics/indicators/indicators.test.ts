import { INDICATORS } from './registry';
import { analysisContext } from '../context';
import { snapshotBaseline } from '../baseline-snapshot';
import { deriveProject } from '../derive';
import { setModuleEnabled } from '@/project/config';
import { aSnapshot, changeRequest, docDeliverable, milestone, NOW, pkg, requirement, START } from '@/test/builders';

const kpi = (ind: { kpis: { label: string; value: number | null }[] }, label: string) =>
  ind.kpis.find((k) => k.label === label)?.value;

describe('INDICATORS.scope', () => {
  it('gap Alta → vermelho e KPIs', () => {
    const s = aSnapshot()
      .requirements(requirement('R', { priority: 'Alta', fulfillmentStatus: 'Não atendido (gap)' }))
      .deliverables(docDeliverable('D1', { status: 'Aprovado' }), docDeliverable('D2'))
      .changeRequests(changeRequest('C1'), changeRequest('C2', { status: 'Cancelada' }))
      .build();
    const ind = INDICATORS.scope(analysisContext(s, START));
    expect(ind.rag).toBe('vermelho');
    expect(kpi(ind, 'Requisitos com gap')).toBe(1);
    expect(kpi(ind, '% entregáveis concluídos')).toBe(50);
    expect(kpi(ind, 'Mudanças pendentes')).toBe(1);
  });
});

describe('INDICATORS.schedule', () => {
  it('pacote crítico atrasado após a LB → vermelho com alerta', () => {
    const s = aSnapshot().wbs(pkg('A', 5)).milestones(milestone('M', ['A'], { code: 'M-001' })).build();
    s.baselines.push(snapshotBaseline(s, deriveProject(s, START), { id: 'b', now: NOW, changeRequestId: null }));
    s.scope.wbs['A' as never] = pkg('A', 12);
    const ind = INDICATORS.schedule(analysisContext(s, START));
    expect(ind.rag).toBe('vermelho');
    expect(kpi(ind, 'Marcos críticos atrasados')).toBe(1);
    expect(ind.alerts.map((a) => a.message)).toEqual([
      'Marco M-001 previsto 7 dias após a linha de base — considerar solicitação de mudança',
    ]);
  });
  it('sem LB: SPI n/a e RAG dos marcos', () => {
    const s = aSnapshot().wbs(pkg('A', 5)).milestones(milestone('M', ['A'])).build();
    const ind = INDICATORS.schedule(analysisContext(s, START));
    expect(kpi(ind, 'SPI físico')).toBeNull();
    expect(kpi(ind, '% físico')).toBe(0);
    expect(ind.rag).toBe('verde');
  });
});

describe('INDICATORS.governance e stakeholders', () => {
  it('mudança parada → amarelo; Escopo desligado → n/a', () => {
    const s = aSnapshot().changeRequests(changeRequest('C', { requestDate: '2025-01-01' })).build();
    expect(INDICATORS.governance(analysisContext(s, START)).rag).toBe('amarelo');
    s.project = { ...s.project, config: setModuleEnabled(s.project.config, 'scope', false) };
    expect(INDICATORS.governance(analysisContext(s, START)).rag).toBe('n/a');
  });
  it('stakeholders é n/a na Etapa 1', () => {
    expect(INDICATORS.stakeholders(analysisContext(aSnapshot().build(), START))).toEqual({
      rag: 'n/a',
      ragReason: 'Análise disponível na Etapa 2',
      kpis: [],
      alerts: [],
    });
  });
});
