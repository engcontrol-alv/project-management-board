import type { RagResult } from '@/core/indicators';
import type { Requirement } from '../model/requirement';

export type RequirementSituation = 'Concluído' | 'Gap crítico' | 'Não validado' | 'Pendente';

export function requirementSituation(
  r: Pick<Requirement, 'validationStatus' | 'fulfillmentStatus'>,
): RequirementSituation {
  if (r.fulfillmentStatus === 'Não atendido (gap)') return 'Gap crítico';
  if (r.validationStatus === 'Validado' && r.fulfillmentStatus === 'Atendido') return 'Concluído';
  if (r.validationStatus === 'Não validado') return 'Não validado';
  return 'Pendente';
}

export function scopeRag(reqs: Pick<Requirement, 'priority' | 'validationStatus' | 'fulfillmentStatus'>[]): RagResult {
  if (!reqs.length) return { rag: 'n/a', reason: 'Sem requisitos cadastrados' };
  const gaps = reqs.filter((r) => r.fulfillmentStatus === 'Não atendido (gap)');
  const highGaps = gaps.filter((r) => r.priority === 'Alta').length;
  if (highGaps) return { rag: 'vermelho', reason: `${highGaps} requisito(s) de prioridade Alta com gap` };
  const highNotValidated = reqs.filter((r) => r.priority === 'Alta' && r.validationStatus === 'Não validado').length;
  if (gaps.length || highNotValidated) {
    const parts = [];
    if (gaps.length) parts.push(`${gaps.length} requisito(s) com gap`);
    if (highNotValidated) parts.push(`${highNotValidated} requisito(s) de prioridade Alta não validado(s)`);
    return { rag: 'amarelo', reason: parts.join('; ') };
  }
  return { rag: 'verde', reason: 'Nenhum requisito com gap' };
}
