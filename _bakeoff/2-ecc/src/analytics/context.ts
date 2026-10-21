import type { IsoDate } from '@/shared/lib/dates';
import { resolveConfig, type ResolvedConfig } from '@/project/config';
import type { ProjectSnapshot } from '@/project/snapshot';
import { deriveProject, type DerivedProject } from './derive';

export type AnalysisContext = { snapshot: ProjectSnapshot; derived: DerivedProject; config: ResolvedConfig };

export function analysisContext(snapshot: ProjectSnapshot, statusDate: IsoDate): AnalysisContext {
  return { snapshot, derived: deriveProject(snapshot, statusDate), config: resolveConfig(snapshot.project.config) };
}
