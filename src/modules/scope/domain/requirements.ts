import type { Rag } from '@/core/indicators';
import type { Requirement } from '../model/requirement';

export type RequirementSituation = 'Concluído' | 'Gap crítico' | 'Não validado' | 'Pendente';

type ReqStatus = Pick<Requirement, 'validationStatus' | 'fulfillmentStatus'>;

export function requirementSituation(r: ReqStatus): RequirementSituation {
  if (r.fulfillmentStatus === 'Não atendido (gap)') return 'Gap crítico';
  if (r.validationStatus === 'Validado' && r.fulfillmentStatus === 'Atendido') return 'Concluído';
  if (r.validationStatus === 'Não validado') return 'Não validado';
  return 'Pendente';
}

export function scopeRag(reqs: (ReqStatus & Pick<Requirement, 'priority'>)[]): {
  rag: Rag;
  reason: string;
} {
  if (reqs.length === 0) return { rag: 'n/a', reason: 'Sem requisitos cadastrados' };
  const gaps = reqs.filter((r) => r.fulfillmentStatus === 'Não atendido (gap)');
  const highGaps = gaps.filter((r) => r.priority === 'Alta');
  if (highGaps.length > 0)
    return { rag: 'vermelho', reason: `${highGaps.length} requisito(s) de prioridade Alta com gap` };
  if (gaps.length > 0) return { rag: 'amarelo', reason: `${gaps.length} requisito(s) com gap` };
  const highNotValidated = reqs.filter(
    (r) => r.priority === 'Alta' && r.validationStatus === 'Não validado',
  );
  if (highNotValidated.length > 0)
    return {
      rag: 'amarelo',
      reason: `${highNotValidated.length} requisito(s) de prioridade Alta não validado(s)`,
    };
  return { rag: 'verde', reason: 'Nenhum requisito com gap' };
}
