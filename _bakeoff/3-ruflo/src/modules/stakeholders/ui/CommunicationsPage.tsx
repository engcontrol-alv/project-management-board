import { formatDateBR } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { communicationStatus } from '../domain/engagement';
import { CHANNELS, FREQUENCIES, type Communication } from '../model/communication';
import { communicationExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'information', label: 'Informação', type: 'text', wide: true, hint: 'O que é comunicado (ex.: relatório de avanço).' },
  {
    key: 'recipientIds',
    label: 'Destinatários',
    type: 'reference',
    module: 'stakeholders',
    collection: 'parties',
    multiple: true,
  },
  { key: 'channel', label: 'Canal', type: 'select', options: CHANNELS },
  { key: 'frequency', label: 'Frequência', type: 'select', options: FREQUENCIES },
  { key: 'nextDate', label: 'Próxima data', type: 'date', hint: 'Vencida = "Atrasada".' },
  { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
];

const newCommunication = (): Values => ({
  code: '',
  information: '',
  recipientIds: [],
  channel: 'E-mail',
  frequency: 'Semanal',
  ownerId: null,
  nextDate: null,
});

export function CommunicationsPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived } = analysis;
  const names = (ids: string[]) =>
    ids.map((id) => snapshot.stakeholders.parties[id as never]?.name ?? '—').join(', ') || '—';
  return (
    <RegisterView<Communication>
      module="stakeholders"
      collection="communications"
      title="Plano de comunicação"
      fields={fields}
      examples={communicationExamples}
      newEntity={newCommunication}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'information', label: 'Informação' },
        { key: 'recipients', label: 'Destinatários', render: (c) => names(c.recipientIds) },
        { key: 'channel', label: 'Canal · frequência', render: (c) => `${c.channel} · ${c.frequency}` },
        { key: 'nextDate', label: 'Próxima', mono: true, render: (c) => formatDateBR(c.nextDate) },
        { key: 'status', label: 'Situação', render: (c) => <StatusBadge status={communicationStatus(c, derived.statusDate)} /> },
      ]}
    />
  );
}
