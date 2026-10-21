import type { Alert } from '@/core/indicators';
import type { ImplementedModuleId } from '@/project/registry';
import type { AnalysisContext } from '../context';

export type AlertRule = {
  id: string;
  /** Módulo em cujo indicador o alerta aparece. */
  module: ImplementedModuleId;
  requires: ImplementedModuleId[];
  evaluate(ctx: AnalysisContext): Alert[];
};
