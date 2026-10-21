import { formatDateBR } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/Badge';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import {
  LESSON_CATEGORIES,
  LESSON_TYPES,
  MEETING_STATUSES,
  MEETING_TYPES,
  NORM_TYPES,
  type Lesson,
  type Meeting,
  type Norm,
} from '../model/records';
import { lessonExamples, meetingExamples, normExamples } from '../examples';

const normFields: FieldDef[] = [
  { key: 'standard', label: 'Norma', type: 'text', hint: 'Ex.: ISO 9001:2015, NBR 5410, NR-10.' },
  { key: 'type', label: 'Tipo', type: 'select', options: NORM_TYPES },
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'notes', label: 'Observação', type: 'textarea' },
];

export function NormsPage() {
  return (
    <RegisterView<Norm>
      module="governance"
      collection="norms"
      title="Qualidade — normas aplicáveis"
      fields={normFields}
      examples={normExamples}
      newEntity={(): Values => ({ code: '', standard: '', type: 'ISO', title: '', notes: '' })}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'standard', label: 'Norma', mono: true },
        { key: 'type', label: 'Tipo' },
        { key: 'title', label: 'Título' },
      ]}
    />
  );
}

const meetingFields: FieldDef[] = [
  { key: 'type', label: 'Tipo', type: 'select', options: MEETING_TYPES },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: MEETING_STATUSES, hint: 'Realizada exige data até hoje.' },
  { key: 'participantIds', label: 'Participantes', type: 'reference', module: 'stakeholders', collection: 'parties', multiple: true },
  { key: 'decisions', label: 'Decisões', type: 'textarea' },
  { key: 'actions', label: 'Ações geradas', type: 'textarea' },
];

export function MeetingsPage({ today }: { today: string }) {
  return (
    <RegisterView<Meeting>
      module="governance"
      collection="meetings"
      title="Reuniões"
      fields={meetingFields}
      examples={meetingExamples}
      newEntity={(): Values => ({
        code: '',
        type: 'Status semanal',
        date: today,
        participantIds: [],
        decisions: '',
        actions: '',
        status: 'Agendada',
      })}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'type', label: 'Tipo' },
        { key: 'date', label: 'Data', mono: true, render: (m) => formatDateBR(m.date) },
        { key: 'status', label: 'Status', render: (m) => <StatusBadge status={m.status} /> },
      ]}
    />
  );
}

const lessonFields: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'type', label: 'Tipo', type: 'select', options: LESSON_TYPES, hint: 'Algo a evitar ou algo a repetir?' },
  { key: 'category', label: 'Categoria', type: 'select', options: LESSON_CATEGORIES },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'context', label: 'Contexto (o que aconteceu)', type: 'textarea' },
  { key: 'recommendation', label: 'Recomendação', type: 'textarea' },
  { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
];

export function LessonsPage() {
  return (
    <RegisterView<Lesson>
      module="governance"
      collection="lessons"
      title="Lições aprendidas"
      fields={lessonFields}
      examples={lessonExamples}
      newEntity={(): Values => ({
        code: '',
        title: '',
        type: 'Ponto de melhoria',
        category: 'Técnica',
        context: '',
        recommendation: '',
        date: null,
        ownerId: null,
      })}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'title', label: 'Lição' },
        { key: 'category', label: 'Categoria' },
        { key: 'type', label: 'Tipo', render: (l) => <StatusBadge status={l.type} /> },
      ]}
    />
  );
}
