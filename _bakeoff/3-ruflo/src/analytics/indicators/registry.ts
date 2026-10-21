import type { ModuleIndicators } from '@/core/indicators';
import type { ImplementedModuleId } from '@/project/registry';
import type { AnalysisContext } from '../alerts/types';
import { financesIndicators } from './finances';
import { governanceIndicators } from './governance';
import { resourcesIndicators } from './resources';
import { risksIndicators } from './risks';
import { scheduleIndicators } from './schedule';
import { scopeIndicators } from './scope';
import { stakeholdersIndicators } from './stakeholders';

export const INDICATORS: { [K in ImplementedModuleId]: (ctx: AnalysisContext) => ModuleIndicators } = {
  governance: governanceIndicators,
  scope: scopeIndicators,
  schedule: scheduleIndicators,
  finances: financesIndicators,
  risks: risksIndicators,
  resources: resourcesIndicators,
  stakeholders: stakeholdersIndicators,
};
