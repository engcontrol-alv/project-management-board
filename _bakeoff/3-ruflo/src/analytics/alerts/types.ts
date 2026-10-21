import type { Alert } from '@/core/indicators';
import type { ResolvedConfig } from '@/project/config';
import type { ImplementedModuleId } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { DerivedProject } from '../derive';

export type AnalysisContext = {
  snapshot: ProjectSnapshot;
  derived: DerivedProject;
  config: ResolvedConfig;
};

export type AlertRule = {
  id: string;
  requires: ImplementedModuleId[];
  evaluate(ctx: AnalysisContext): Alert[];
};
