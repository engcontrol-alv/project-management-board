import type { ModuleIndicators } from '@/core/indicators';
import type { ImplementedModuleId } from '@/project/registry';
import type { AnalysisContext } from '../context';
import { governanceIndicators } from './governance';
import { scheduleIndicators } from './schedule';
import { scopeIndicators } from './scope';
import { stakeholdersIndicators } from './stakeholders';

export const INDICATORS: { [K in ImplementedModuleId]: (ctx: AnalysisContext) => ModuleIndicators } = {
  governance: governanceIndicators,
  scope: scopeIndicators,
  schedule: scheduleIndicators,
  stakeholders: stakeholdersIndicators,
};
