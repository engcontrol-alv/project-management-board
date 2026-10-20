import { expectedValue, isOpen } from '@/modules/risks';
import type { AlertRule } from './types';

/** Valor esperado dos riscos abertos maior que o saldo de contingência (SPEC §9.2). */
export const contingencyInsufficient: AlertRule = {
  id: 'contingency-insufficient',
  requires: ['finances', 'risks'],
  evaluate: ({ snapshot, derived }) => {
    const c = derived.finances?.contingency;
    if (!c || c.openRiskEmv === 0 || c.coversRisks) return [];
    // Atalho para o risco aberto de maior valor esperado.
    const top = Object.values(snapshot.risks.risks)
      .filter(isOpen)
      .sort((a, b) => (expectedValue(b) ?? 0) - (expectedValue(a) ?? 0))[0];
    return [
      {
        id: 'contingency-insufficient',
        severity: 'vermelho',
        message: 'Reserva de contingência insuficiente',
        action: top ? { kind: 'openRecord', module: 'risks', collection: 'risks', id: top.id } : undefined,
      },
    ];
  },
};
