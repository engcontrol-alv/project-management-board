import type { ChangeRequestId, LessonId, MeetingId, NormId } from '@/core/ids';
import type { ChangeRequest } from './model/change-request';
import { emptyProfile, type GovernanceProfile } from './model/profile';
import type { Lesson, Meeting, Norm } from './model/records';

export * from './model/profile';
export * from './model/records';
export * from './model/change-request';
export * from './domain/governance';
export * from './domain/penalty';
export * from './domain/change-requests';
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
  changeRequests: Record<ChangeRequestId, ChangeRequest>;
};

export function emptyGovernanceData(projectId: string): GovernanceData {
  return { profile: emptyProfile(projectId), norms: {}, meetings: {}, lessons: {}, changeRequests: {} };
}
