import { quadrant, type Organization } from '@/modules/stakeholders';
import type { ProjectSnapshot } from '@/project/snapshot';
import { supplierPanel } from '../supplier-panel';
import type { AlertRule } from './types';

const openParty = (id: string) => ({ kind: 'openRecord' as const, module: 'stakeholders', collection: 'parties', id });

function suppliers(s: ProjectSnapshot): Organization[] {
  const ids = new Set(Object.values(s.finances.procurements).map((p) => p.supplierId));
  return Object.values(s.stakeholders.parties).filter(
    (p): p is Organization => p.kind === 'Organização' && ids.has(p.id),
  );
}

export function hasCommunicationPlan(s: ProjectSnapshot, partyId: string): boolean {
  return Object.values(s.stakeholders.communications).some((c) => c.recipientIds.includes(partyId as never));
}

/** Fornecedor em "Gerenciar de perto" + "Opositor" com contratação crítica (SPEC §9.2). */
export const supplierDisengaged: AlertRule = {
  id: 'supplier-disengaged',
  requires: ['finances', 'stakeholders'],
  evaluate: ({ snapshot }) =>
    suppliers(snapshot).flatMap((o) => {
      const a = o.analysis;
      const critical = Object.values(snapshot.finances.procurements).some(
        (p) => p.supplierId === o.id && p.criticality === 'Alta' && p.contractStatus !== 'Cancelado',
      );
      if (!a || !critical || quadrant(a) !== 'Gerenciar de perto' || a.currentPosture !== 'Opositor') return [];
      return [
        {
          id: `supplier-disengaged:${o.id}`,
          severity: 'vermelho' as const,
          message: `Fornecedor crítico desengajado: ${o.code} ${o.name}`,
          action: openParty(o.id),
        },
      ];
    }),
};

/** Fornecedor com comprometido acima do limite em "Monitorar" ou sem plano de comunicação (SPEC §6.7). */
export const supplierUnmonitored: AlertRule = {
  id: 'supplier-unmonitored',
  requires: ['finances', 'stakeholders'],
  evaluate: ({ snapshot, derived }) =>
    suppliers(snapshot).flatMap((o) => {
      if (!supplierPanel(snapshot, derived, o.id).highlighted) return [];
      const monitorOnly = o.analysis ? quadrant(o.analysis) === 'Monitorar' : false;
      if (!monitorOnly && hasCommunicationPlan(snapshot, o.id)) return [];
      return [
        {
          id: `supplier-unmonitored:${o.id}`,
          severity: 'amarelo' as const,
          message: `Fornecedor ${o.code} com comprometido acima do limite sem acompanhamento`,
          action: openParty(o.id),
        },
      ];
    }),
};
