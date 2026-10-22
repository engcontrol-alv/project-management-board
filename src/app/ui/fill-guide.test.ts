import { describe, expect, it } from 'vitest';
import { aBudgetLine, aDocument, aGroup, aPackage, aRisk } from '@/test/factories';
import { aSnapshot, PROJECT_START } from '@/test/builders';
import { snapshotBaseline } from '@/analytics/baseline-snapshot';
import { deriveProject } from '@/analytics/derive';
import type { ImplementedModuleId } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';
import { fillGuideSteps, guideProgress } from './fill-guide';

const ALL: Record<ImplementedModuleId, boolean> = {
  governance: true,
  scope: true,
  schedule: true,
  finances: true,
  risks: true,
  resources: true,
  stakeholders: true,
};

const withLb = (s: ProjectSnapshot): ProjectSnapshot => ({
  ...s,
  baselines: [snapshotBaseline(s, deriveProject(s, PROJECT_START), { id: 'lb', now: 'n', changeRequestId: null })],
});

/** Projeto com os 5 passos iniciais cumpridos. */
const filledProject = () =>
  withLb(
    aSnapshot()
      .withProfile((p) => ({
        ...p,
        charter: { ...p.charter, approvalDate: '2026-01-02' },
        latePenalty: { ...p.latePenalty, contractValueCents: 150_000_000 },
      }))
      .withPackage(aPackage({ id: 'A', code: '1', duration: 5 }))
      .withDeliverable(aDocument())
      .withBudgetLine(aBudgetLine({ budgetedCents: 100_000 }))
      .withRisk(aRisk())
      .build(),
  );

const done = (s: ProjectSnapshot, enabled = ALL) =>
  Object.fromEntries(fillGuideSteps(s, enabled).map((st) => [st.id, st.done]));

describe('Guia de Preenchimento — ordem e detecção automática', () => {
  it('lista os 6 passos na ordem lógica; projeto novo tem 0/5 passos iniciais', () => {
    const steps = fillGuideSteps(aSnapshot().build(), ALL);
    expect(steps.map((s) => s.title)).toEqual([
      'Governança',
      'Escopo',
      'Cronograma',
      'Finanças',
      'Riscos',
      'Rotina de Atualização',
    ]);
    expect(steps.map((s) => s.done)).toEqual([false, false, false, false, false, null]);
    expect(guideProgress(steps)).toEqual({ done: 0, total: 5 });
    expect(steps[2]!.text).toMatch(/Linha de Base.*Previsto até a Data \(PV\).*Ritmo do Prazo \(SPI\)/);
    expect(steps[3]!.text).toMatch(/Orçamento Total \(BAC\)/);
    expect(steps[5]!.text).toMatch(/Trabalho Entregue \(EV\).*Custo Realizado \(AC\).*Eficiência de Custo \(CPI\)/);
  });

  it('cada passo conclui quando o dado existe; a rotina nunca é marcada', () => {
    const s = filledProject();
    expect(done(s)).toEqual({
      governance: true,
      scope: true,
      schedule: true,
      finances: true,
      risks: true,
      routine: null,
    });
    expect(guideProgress(fillGuideSteps(s, ALL))).toEqual({ done: 5, total: 5 });
  });

  it('dados parciais não concluem o passo', () => {
    const s = aSnapshot()
      .withProfile((p) => ({ ...p, charter: { ...p.charter, approvalDate: '2026-01-02' } }))
      .withPackage(aGroup({ id: 'G', code: '1' }))
      .withBudgetLine(aBudgetLine({ budgetedCents: 0 }))
      .build();
    // Data sem dado do contrato; só agrupador e sem entregável; orçamento zerado; sem LB nem riscos.
    expect(done(s)).toMatchObject({ governance: false, scope: false, schedule: false, finances: false, risks: false });
  });

  it('módulo desligado sai do guia e do contador; atalhos levam à aba do domínio', () => {
    const steps = fillGuideSteps(aSnapshot().build(), { ...ALL, finances: false, risks: false });
    expect(steps.map((s) => s.id)).toEqual(['governance', 'scope', 'schedule', 'routine']);
    expect(guideProgress(steps)).toEqual({ done: 0, total: 3 });
    expect(steps.find((s) => s.id === 'routine')!.links.map((l) => l.label)).toEqual(['Abrir EAP →']);
    expect(fillGuideSteps(aSnapshot().build(), ALL).flatMap((s) => s.links)).toEqual([
      { label: 'Abrir Governança →', to: '/projeto/governance/abertura-encerramento' },
      { label: 'Abrir Escopo →', to: '/projeto/scope/eap' },
      { label: 'Abrir Cronograma →', to: '/projeto/schedule/marcos' },
      { label: 'Abrir Finanças →', to: '/projeto/finances/orcamento' },
      { label: 'Abrir Riscos →', to: '/projeto/risks/registro' },
      { label: 'Abrir EAP →', to: '/projeto/scope/eap' },
      { label: 'Abrir Finanças →', to: '/projeto/finances/orcamento' },
    ]);
  });
});
