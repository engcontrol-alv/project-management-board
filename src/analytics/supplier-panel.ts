import type { PartyId, RiskId } from '@/core/ids';
import { moneySummary, type Totals } from '@/modules/finances';
import { resolveConfig } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { DerivedProject } from './derive';
import { toCostItems } from './finances';

export type SupplierPanel = {
  totals: Totals;
  procurements: { id: string; code: string; description: string; deliveryStatus: string; dueDate: string | null; late: boolean }[];
  risks: RiskId[];
  /** Comprometido acima do limite configurado em Partes Interessadas. */
  highlighted: boolean;
};

/** Projeção (nunca cópia) das contratações e riscos de uma organização fornecedora (SPEC §6.7). */
export function supplierPanel(s: ProjectSnapshot, d: DerivedProject, orgId: string): SupplierPanel {
  const { settings } = resolveConfig(s.project.config);
  const own = Object.values(s.finances.procurements).filter((p) => p.supplierId === orgId);
  const ids = new Set<string>(own.map((p) => p.id));
  const items = toCostItems(s, settings.finances.baseCurrency).filter((i) => ids.has(i.id));
  const totals = moneySummary(items).total;
  const risks = Object.values(s.risks.risks)
    .filter((r) => r.procurementIds.some((p) => ids.has(p)) || r.partyIds.includes(orgId as PartyId))
    .map((r) => r.id);
  return {
    totals,
    procurements: own
      .sort((a, b) => a.code.localeCompare(b.code))
      .map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
        deliveryStatus: p.deliveryStatus,
        dueDate: p.dueDate,
        late: !!p.dueDate && p.dueDate < d.statusDate && !p.completionDate && p.contractStatus !== 'Cancelado',
      })),
    risks,
    highlighted: totals.committed > settings.stakeholders.supplierCommittedThresholdCents,
  };
}
