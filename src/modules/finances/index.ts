import type { BudgetLineId, ProcurementId } from '@/core/ids';
import type { BudgetLine } from './model/budget-line';
import type { Procurement } from './model/procurement';

export * from './model/budget-line';
export * from './model/procurement';
export * from './domain/money-summary';
export * from './domain/cashflow';
export * from './domain/contingency';
export * from './domain/evm';
export * from './domain/evm-labels';
export * from './domain/rag';
export { CURRENCIES, financesManifest, financesSettingsSchema, type FinancesSettings } from './manifest';

export type FinancesData = {
  budgetLines: Record<BudgetLineId, BudgetLine>;
  procurements: Record<ProcurementId, Procurement>;
};

export function emptyFinancesData(): FinancesData {
  return { budgetLines: {}, procurements: {} };
}
