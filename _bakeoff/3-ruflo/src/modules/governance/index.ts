import type { LessonId, MeetingId, NormId } from '@/core/ids';
import { emptyProfile, type GovernanceProfile } from './model/profile';
import type { Lesson, Meeting, Norm } from './model/records';

export * from './model/profile';
export * from './model/records';
export * from './domain/governance';
export * from './domain/penalty';
export {
  governanceManifest,
  governanceSettingsSchema,
  type GovernanceSettings,
} from './manifest';

export type GovernanceData = {
  profile: GovernanceProfile;
  norms: Record<NormId, Norm>;
  meetings: Record<MeetingId, Meeting>;
  lessons: Record<LessonId, Lesson>;
};

export function emptyGovernanceData(projectId: string): GovernanceData {
  return { profile: emptyProfile(projectId), norms: {}, meetings: {}, lessons: {} };
}
