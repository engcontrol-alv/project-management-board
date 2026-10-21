import type { RiskId } from '@/core/ids';
import type { Risk } from './model/risk';

export * from './model/risk';
export * from './domain/exposure';
export * from './domain/rag';
export * from './domain/rescale';
export { DEFAULT_BANDS, DEFAULT_RISK_CATEGORIES, risksManifest, risksSettingsSchema, type RisksSettings } from './manifest';

export type RisksData = { risks: Record<RiskId, Risk> };

export function emptyRisksData(): RisksData {
  return { risks: {} };
}
