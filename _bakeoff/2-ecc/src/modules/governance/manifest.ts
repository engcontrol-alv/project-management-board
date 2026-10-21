import { z } from 'zod';
import type { LessonId, MeetingId, NormId, ProjectId } from '@/core/ids';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { emptyProfile, profileSchema, type GovernanceProfile } from './model/profile';
import { normSchema, type Norm } from './model/norm';
import { meetingSchema, type Meeting } from './model/meeting';
import { lessonSchema, type Lesson } from './model/lesson';

const party = (field: string, label: string, constraint?: string, many = false): RefDef => ({
  field,
  label,
  target: { module: 'stakeholders', collection: 'parties' },
  many,
  required: false,
  ...(constraint ? { constraint } : {}),
});

export const governanceSettingsSchema = z.object({ staleChangeDays: z.number().int().min(1) });
export type GovernanceSettings = z.infer<typeof governanceSettingsSchema>;

export const profileCollection: CollectionDef<GovernanceProfile> = {
  module: 'governance',
  name: 'profile',
  table: 'governance_profile',
  label: 'Abertura e encerramento',
  cardinality: 'one',
  schema: profileSchema,
  refs: [
    party('charter.clientId', 'cliente', 'isClientOrganization'),
    party('charter.sponsorId', 'patrocinador', 'isPerson'),
    party('charter.managerId', 'gerente', 'isPerson'),
  ],
  describe: () => 'Ficha do projeto',
};

export const normsCollection: CollectionDef<Norm> = {
  module: 'governance',
  name: 'norms',
  table: 'governance_norms',
  label: 'Normas aplicáveis',
  cardinality: 'many',
  schema: normSchema,
  codePrefix: 'NRM',
  refs: [],
  describe: (n) => `${n.code} ${n.standard}`,
};

export const meetingsCollection: CollectionDef<Meeting> = {
  module: 'governance',
  name: 'meetings',
  table: 'governance_meetings',
  label: 'Reuniões',
  cardinality: 'many',
  schema: meetingSchema,
  codePrefix: 'REU',
  refs: [party('participantIds', 'participantes', undefined, true)],
  describe: (m) => `${m.code} ${m.type}`,
};

export const lessonsCollection: CollectionDef<Lesson> = {
  module: 'governance',
  name: 'lessons',
  table: 'governance_lessons',
  label: 'Lições aprendidas',
  cardinality: 'many',
  schema: lessonSchema,
  codePrefix: 'LIC',
  refs: [party('ownerId', 'responsável', 'isPerson')],
  describe: (l) => `${l.code} ${l.title}`,
};

export const governanceManifest: ModuleManifest<typeof governanceSettingsSchema> = {
  id: 'governance',
  label: 'Governança',
  mandatory: true,
  requires: [],
  settingsSchema: governanceSettingsSchema,
  defaultSettings: { staleChangeDays: 15 },
  collections: [
    profileCollection as CollectionDef,
    normsCollection as CollectionDef,
    meetingsCollection as CollectionDef,
    lessonsCollection as CollectionDef,
  ],
  constraints: {},
};

export type GovernanceData = {
  profile: GovernanceProfile;
  norms: Record<NormId, Norm>;
  meetings: Record<MeetingId, Meeting>;
  lessons: Record<LessonId, Lesson>;
};

export function emptyGovernanceData(projectId: ProjectId): GovernanceData {
  return { profile: emptyProfile(projectId), norms: {}, meetings: {}, lessons: {} };
}
