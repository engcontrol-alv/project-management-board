import { StatusBadge } from '@/shared/ui/Badge';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import {
  FULFILLMENT_STATUSES,
  PRIORITIES,
  REQ_CATEGORIES,
  REQ_ORIGINS,
  VALIDATION_STATUSES,
  type Requirement,
} from '../model/requirement';
import { requirementSituation } from '../domain/requirements';
import { requirementExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'description', label: 'Descrição', type: 'textarea' },
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
  { key: 'lastValidation', label: 'Data da última validação', type: 'date', hint: 'Obrigatória quando Validado.' },
  { key: 'acceptanceCriteria', label: 'Critério de aceite', type: 'textarea' },
  { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  { key: 'deliverableIds', label: 'Entregáveis que atendem', type: 'reference', module: 'scope', collection: 'deliverables', multiple: true },
];

const newRequirement = (): Values => ({
  code: '',
  description: '',
  category: 'Técnico',
  origin: 'Cliente',
  priority: 'Média',
  validationStatus: 'Não validado',
  fulfillmentStatus: 'Não iniciado',
  acceptanceCriteria: '',
  ownerId: null,
  lastValidation: null,
  deliverableIds: [],
});

export function RequirementsPage() {
  return (
    <RegisterView<Requirement>
      module="scope"
      collection="requirements"
      title="Requisitos"
      fields={fields}
      examples={requirementExamples}
      newEntity={newRequirement}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'description', label: 'Requisito' },
        { key: 'category', label: 'Categoria' },
        { key: 'priority', label: 'Prioridade', render: (r) => <StatusBadge status={r.priority} /> },
        { key: 'situation', label: 'Situação', render: (r) => <StatusBadge status={requirementSituation(r)} /> },
      ]}
    />
  );
}
