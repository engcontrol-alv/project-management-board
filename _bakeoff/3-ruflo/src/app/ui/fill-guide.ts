import type { ImplementedModuleId } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';

export type GuideLink = { label: string; to: string };

export type GuideStep = {
  id: ImplementedModuleId | 'routine';
  title: string;
  text: string;
  /** `null` = rotina contínua, sem "concluído". */
  done: boolean | null;
  links: GuideLink[];
};

const EAP: GuideLink = { label: 'Abrir EAP →', to: '/projeto/scope/eap' };
const BUDGET: GuideLink = { label: 'Abrir Finanças →', to: '/projeto/finances/orcamento' };

/** Ordem de preenchimento do projeto, com detecção automática do que já existe (passos 1–5). */
export function fillGuideSteps(
  s: ProjectSnapshot,
  enabled: Record<ImplementedModuleId, boolean>,
): GuideStep[] {
  const { charter, closure, latePenalty } = s.governance.profile;
  const steps: GuideStep[] = [
    {
      id: 'governance',
      title: 'Governança',
      text: 'Defina as datas do projeto (aprovação, encerramento previsto) e os dados do contrato (cliente, valor do contrato).',
      done:
        (charter.approvalDate !== null || closure.plannedDate !== null) &&
        (charter.clientId !== null || (latePenalty.contractValueCents ?? 0) > 0),
      links: [{ label: 'Abrir Governança →', to: '/projeto/governance/abertura-encerramento' }],
    },
    {
      id: 'scope',
      title: 'Escopo',
      text: 'Cadastre os pacotes de trabalho na EAP e os entregáveis.',
      done:
        Object.values(s.scope.wbs).some((n) => n.kind === 'Pacote de trabalho') &&
        Object.keys(s.scope.deliverables).length > 0,
      links: [{ label: 'Abrir Escopo →', to: '/projeto/scope/eap' }],
    },
    {
      id: 'schedule',
      title: 'Cronograma',
      text: 'Cadastre marcos e atividades e salve a Linha de Base: sem ela não se calculam o Previsto até a Data (PV) e o Ritmo do Prazo (SPI).',
      done: s.baselines.length > 0,
      links: [{ label: 'Abrir Cronograma →', to: '/projeto/schedule/marcos' }],
    },
    {
      id: 'finances',
      title: 'Finanças',
      text: 'Lance o orçamento planejado: a soma dos itens gera o Orçamento Total (BAC).',
      done: Object.values(s.finances.budgetLines).some((l) => l.budgetedCents > 0),
      links: [BUDGET],
    },
    {
      id: 'risks',
      title: 'Riscos',
      text: 'Mapeie os riscos iniciais na matriz de probabilidade × impacto.',
      done: Object.keys(s.risks.risks).length > 0,
      links: [{ label: 'Abrir Riscos →', to: '/projeto/risks/registro' }],
    },
    {
      id: 'routine',
      title: 'Rotina de Atualização',
      text: 'A cada data de status, atualize o % de avanço na EAP (gera o Trabalho Entregue (EV)) e os gastos realizados em Finanças (geram o Custo Realizado (AC) e a Eficiência de Custo (CPI)).',
      done: null,
      links: enabled.finances ? [EAP, BUDGET] : [EAP],
    },
  ];
  // Módulo desligado na Governança não entra no guia.
  return steps.filter((st) => st.id === 'routine' || enabled[st.id]);
}

export function guideProgress(steps: GuideStep[]) {
  const initial = steps.filter((s) => s.done !== null);
  return { done: initial.filter((s) => s.done).length, total: initial.length };
}
