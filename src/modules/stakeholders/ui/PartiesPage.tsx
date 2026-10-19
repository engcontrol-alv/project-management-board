import { StatusBadge } from '@/shared/ui/Badge';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { INTERNAL_OPTIONS, ORG_ROLES, PARTY_KINDS, type Party } from '../model/party';
import { partyExamples } from '../examples';

const isPerson = (v: Values) => v.kind === 'Pessoa';
const isOrg = (v: Values) => v.kind === 'Organização';

const fields: FieldDef[] = [
  { key: 'kind', label: 'Tipo', type: 'select', options: PARTY_KINDS },
  { key: 'name', label: 'Nome / razão social', type: 'text' },
  { key: 'position', label: 'Cargo', type: 'text', visible: isPerson },
  {
    key: 'organizationId',
    label: 'Organização',
    type: 'reference',
    module: 'stakeholders',
    collection: 'parties',
    constraint: 'isOrganization',
    visible: isPerson,
  },
  {
    key: 'roles',
    label: 'Papéis',
    type: 'multiselect',
    options: ORG_ROLES,
    visible: isOrg,
    hint: 'Ao menos um. Cliente é exigido para o cliente da ficha do projeto.',
  },
  { key: 'taxId', label: 'CNPJ', type: 'text', visible: isOrg, hint: 'Opcional; validado quando informado.' },
  { key: 'country', label: 'País', type: 'text', visible: isOrg },
  { key: 'contact', label: 'Contato', type: 'text' },
  { key: 'internal', label: 'Interno/externo', type: 'select', options: INTERNAL_OPTIONS },
  { key: 'notes', label: 'Observações', type: 'textarea' },
];

const common = (v: Values) => ({
  id: v.id,
  code: v.code ?? '',
  name: v.name ?? '',
  contact: v.contact ?? '',
  internal: v.internal ?? 'Interno',
  notes: v.notes ?? '',
});

export const newPerson = (): Values => ({ ...common({}), kind: 'Pessoa', position: '', organizationId: null });

/** Trocar o tipo reconstrói o registro só com os campos do novo tipo (pessoa ≠ organização). */
const onDraftChange: DraftChange = (prev, next) => {
  if (prev.kind === next.kind) return { value: next };
  return {
    value:
      next.kind === 'Organização'
        ? { ...common(next), kind: 'Organização', roles: [], taxId: '', country: 'Brasil' }
        : { ...common(next), kind: 'Pessoa', position: '', organizationId: null },
  };
};

export function PartiesPage() {
  return (
    <RegisterView<Party>
      module="stakeholders"
      collection="parties"
      title="Pessoas e organizações"
      fields={fields}
      examples={partyExamples}
      newEntity={newPerson}
      onDraftChange={onDraftChange}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'name', label: 'Nome' },
        { key: 'kind', label: 'Tipo', render: (p) => <StatusBadge status={p.kind} /> },
        { key: 'detail', label: 'Cargo / papéis', render: (p) => (p.kind === 'Pessoa' ? p.position : p.roles.join(', ')) },
        { key: 'internal', label: 'Interno/externo' },
      ]}
    />
  );
}
