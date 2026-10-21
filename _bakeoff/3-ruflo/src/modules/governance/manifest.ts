import { z } from 'zod';
import type { CollectionDef, ModuleManifest, RefDef } from '@/core/module-contract';
import { changeRequestSchema, type ChangeRequest } from './model/change-request';
import { profileSchema, type GovernanceProfile } from './model/profile';
import {
  lessonSchema,
  meetingSchema,
  normSchema,
  type Lesson,
  type Meeting,
  type Norm,
} from './model/records';

const party = (field: string, label: string, constraint?: string, many = false): RefDef => ({
  field,
  label,
  target: { module: 'stakeholders', collection: 'parties' },
  many,
  required: false,
  ...(constraint ? { constraint } : {}),
});

const profile: CollectionDef<GovernanceProfile> = {
  module: 'governance',
  name: 'profile',
  table: 'governance_profile',
  label: 'Ficha do projeto',
  cardinality: 'one',
  schema: profileSchema,
  refs: [
    party('charter.clientId', 'cliente', 'isClientOrganization'),
    party('charter.sponsorId', 'patrocinador', 'isPerson'),
    party('charter.managerId', 'gerente', 'isPerson'),
  ],
  describe: () => 'Ficha do projeto',
};

const norms: CollectionDef<Norm> = {
  module: 'governance',
  name: 'norms',
  table: 'governance_norms',
  label: 'Normas aplicáveis',
  cardinality: 'many',
  schema: normSchema,
  codePrefix: 'NRM',
  refs: [],
  describe: (n) => `${n.code} ${n.standard}`.trim(),
};

const meetings: CollectionDef<Meeting> = {
  module: 'governance',
  name: 'meetings',
  table: 'governance_meetings',
  label: 'Reuniões',
  cardinality: 'many',
  schema: meetingSchema,
  codePrefix: 'REU',
  refs: [party('participantIds', 'participantes', undefined, true)],
  describe: (m) => `${m.code} ${m.type}`.trim(),
};

const lessons: CollectionDef<Lesson> = {
  module: 'governance',
  name: 'lessons',
  table: 'governance_lessons',
  label: 'Lições aprendidas',
  cardinality: 'many',
  schema: lessonSchema,
  codePrefix: 'LIC',
  refs: [party('ownerId', 'responsável', 'isPerson')],
  describe: (l) => `${l.code} ${l.title}`.trim(),
};

/** Controle integrado de mudanças (Etapa 4: saiu do Escopo). Os vínculos com EAP e entregáveis são dados (RefDef). */
const changeRequests: CollectionDef<ChangeRequest> = {
  module: 'governance',
  name: 'changeRequests',
  table: 'governance_changeRequests',
  label: 'Solicitações de mudança',
  cardinality: 'many',
  schema: changeRequestSchema,
  codePrefix: 'MUD',
  refs: [
    party('requesterId', 'solicitante', 'isPerson'),
    party('approverId', 'aprovador', 'isPerson'),
    party('implementerId', 'responsável pela implementação', 'isPerson'),
    {
      field: 'affectedWorkPackageIds',
      label: 'pacotes afetados',
      target: { module: 'scope', collection: 'wbs' },
      many: true,
      required: false,
    },
    {
      field: 'affectedDeliverableIds',
      label: 'entregáveis afetados',
      target: { module: 'scope', collection: 'deliverables' },
      many: true,
      required: false,
    },
  ],
  describe: (c) => `${c.code} ${c.title}`.trim(),
};

export const governanceSettingsSchema = z.object({
  staleChangeDays: z.number().int().min(1),
});
export type GovernanceSettings = z.infer<typeof governanceSettingsSchema>;

export const governanceManifest: ModuleManifest<typeof governanceSettingsSchema> = {
  id: 'governance',
  label: 'Governança',
  mandatory: true,
  requires: [],
  settingsSchema: governanceSettingsSchema,
  defaultSettings: { staleChangeDays: 15 },
  collections: [profile, norms, meetings, lessons, changeRequests],
  constraints: {},
};
