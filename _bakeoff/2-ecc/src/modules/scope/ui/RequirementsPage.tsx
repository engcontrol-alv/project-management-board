import { Badge } from '@/shared/ui/Badge';
import { statusTone } from '@/shared/ui/tones';
import { formatDateBR } from '@/shared/lib/dates';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import {
  FULFILLMENT_STATUSES,
  PRIORITIES,
  REQ_CATEGORIES,
  REQ_ORIGINS,
  VALIDATION_STATUSES,
  requirementSituation,
  type Requirement,
} from '../index';
import { requirementExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'description', label: 'Descrição', type: 'textarea', required: true },
  { key: 'category', label: 'Categoria', type: 'select', options: REQ_CATEGORIES },
  { key: 'origin', label: 'Origem', type: 'select', options: REQ_ORIGINS },
  { key: 'priority', label: 'Prioridade', type: 'select', options: PRIORITIES },
  {
    key: 'validationStatus',
    label: 'Status de validação',
    type: 'select',
    options: VALIDATION_STATUSES,
    hint: 'O cliente já confirmou este requisito formalmente?',
  },
  {
    key: 'fulfillmentStatus',
    label: 'Status de atendimento',
    type: 'select',
    options: FULFILLMENT_STATUSES,
    hint: 'A solução já entrega este requisito?',
  },
  { key: 'acceptanceCriteria', label: 'Critério de aceite', type: 'textarea' },
  { key: 'lastValidation', label: 'Data da última validação', type: 'date', hint: 'Obrigatória quando Validado.' },
  { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  { key: 'deliverableIds', label: 'Entregáveis que atendem', type: 'reference', module: 'scope', collection: 'deliverables', multiple: true },
];

const newRequirement = () =>
  ({
    id: '',
    code: '',
    description: '',
    category: 'Funcional',
    origin: 'Cliente',
    priority: 'Média',
    validationStatus: 'Não validado',
    fulfillmentStatus: 'Não iniciado',
    acceptanceCriteria: '',
    ownerId: null,
    lastValidation: null,
    deliverableIds: [],
  }) as unknown as Requirement;

export function RequirementsPage() {
  return (
    <RegisterView<Requirement>
      module="scope"
      collection="requirements"
      title="Requisitos"
      columns={[
        { key: 'description', label: 'Requisito' },
        { key: 'category', label: 'Categoria' },
        { key: 'priority', label: 'Prioridade', render: (r) => <Badge text={r.priority} tone={statusTone(r.priority)} /> },
        {
          key: 'situation',
          label: 'Situação',
          render: (r) => {
            const s = requirementSituation(r);
            return <Badge text={s} tone={statusTone(s)} />;
          },
        },
        { key: 'lastValidation', label: 'Última validação', render: (r) => formatDateBR(r.lastValidation) },
      ]}
      fields={fields}
      examples={requirementExamples}
      newEntity={newRequirement}
    />
  );
}
