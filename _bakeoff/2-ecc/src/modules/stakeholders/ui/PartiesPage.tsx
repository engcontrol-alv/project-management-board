import { Badge } from '@/shared/ui/Badge';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { INTERNAL_OPTIONS, ORG_ROLES, PARTY_KINDS, type Party } from '../index';
import { partyExamples } from '../examples';

type Draft = Record<string, unknown>;
const isPerson = (v: Draft) => v.kind === 'Pessoa';
const isOrg = (v: Draft) => v.kind === 'Organização';

const fields: FieldDef[] = [
  { key: 'kind', label: 'Tipo', type: 'select', options: PARTY_KINDS },
  { key: 'name', label: 'Nome', type: 'text', required: true },
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
  { key: 'roles', label: 'Papéis', type: 'multiselect', options: ORG_ROLES, visible: isOrg, hint: 'Ao menos um papel.' },
  { key: 'taxId', label: 'CNPJ', type: 'text', visible: isOrg, hint: 'Opcional; somente números ou formatado.' },
  { key: 'country', label: 'País', type: 'text', visible: isOrg },
  { key: 'contact', label: 'Contato', type: 'text' },
  { key: 'internal', label: 'Interno/externo', type: 'select', options: INTERNAL_OPTIONS },
  { key: 'notes', label: 'Observações', type: 'textarea' },
];

const PERSON_KEYS = { position: '', organizationId: null };
const ORG_KEYS = { roles: [], taxId: '', country: '' };

const newParty = () =>
  ({ id: '', code: '', kind: 'Pessoa', name: '', contact: '', internal: 'Interno', notes: '', ...PERSON_KEYS }) as unknown as Party;

/** Pessoa e organização têm campos exclusivos (união discriminada estrita). */
function onKindChange(prev: Party, next: Party) {
  if (prev.kind === next.kind) return { value: next };
  const draft = { ...(next as unknown as Draft) };
  for (const k of Object.keys(next.kind === 'Pessoa' ? ORG_KEYS : PERSON_KEYS)) delete draft[k];
  return { value: { ...(next.kind === 'Pessoa' ? PERSON_KEYS : ORG_KEYS), ...draft } as unknown as Party };
}

export function PartiesPage() {
  return (
    <RegisterView<Party>
      module="stakeholders"
      collection="parties"
      title="Pessoas e organizações"
      description={
        <p className="tb-hint">
          Cadastro básico sempre disponível: responsáveis, cliente e fornecedores apontam para estes registros.
        </p>
      }
      columns={[
        { key: 'name', label: 'Nome' },
        { key: 'kind', label: 'Tipo' },
        {
          key: 'detail',
          label: 'Cargo / papéis',
          render: (p) =>
            p.kind === 'Pessoa' ? p.position || '—' : p.roles.map((r) => <Badge key={r} text={r} tone="blue" />),
        },
        { key: 'internal', label: 'Interno/externo' },
      ]}
      fields={fields}
      examples={partyExamples}
      newEntity={newParty}
      transform={onKindChange}
    />
  );
}
