import { Badge } from '@/shared/ui/Badge';
import { statusTone } from '@/shared/ui/tones';
import { formatDateBR } from '@/shared/lib/dates';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { useRepository } from '@/platform/react/RepositoryProvider';
import { MEETING_STATUSES, MEETING_TYPES, type Meeting } from '../index';
import { meetingExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'type', label: 'Tipo', type: 'select', options: MEETING_TYPES },
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'participantIds', label: 'Participantes', type: 'reference', module: 'stakeholders', collection: 'parties', multiple: true },
  { key: 'decisions', label: 'Decisões', type: 'textarea' },
  { key: 'actions', label: 'Ações geradas', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: MEETING_STATUSES, hint: 'Realizada exige data igual ou anterior a hoje.' },
];

export function MeetingsPage() {
  const { clock } = useRepository();
  const newMeeting = () =>
    ({ id: '', code: '', type: 'Status semanal', date: clock.today(), participantIds: [], decisions: '', actions: '', status: 'Agendada' }) as unknown as Meeting;
  return (
    <RegisterView<Meeting>
      module="governance"
      collection="meetings"
      title="Reuniões"
      columns={[
        { key: 'type', label: 'Tipo' },
        { key: 'date', label: 'Data', mono: true, render: (m) => formatDateBR(m.date) },
        { key: 'decisions', label: 'Decisões' },
        { key: 'status', label: 'Status', render: (m) => <Badge text={m.status} tone={statusTone(m.status)} /> },
      ]}
      fields={fields}
      examples={meetingExamples}
      newEntity={newMeeting}
    />
  );
}
