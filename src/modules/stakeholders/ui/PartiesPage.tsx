import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { quadrant } from '../domain/engagement';
import {
  INTERNAL_OPTIONS,
  LEVELS,
  ORG_ROLES,
  PARTY_KINDS,
  POSTURES,
  type Party,
  type StakeholderAnalysis,
} from '../model/party';
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

const analyzed = (v: Values) => !!v.analysis && typeof v.analysis === 'object';

/** Campos da análise (módulo Partes Interessadas ligado). */
const analysisFields: FieldDef[] = [
  {
    key: 'analysis',
    label: 'Analisar esta parte interessada',
    type: 'boolean',
    wide: true,
    hint: 'Poder × interesse, engajamento e estratégia de comunicação.',
  },
  { key: 'analysis.power', label: 'Poder', type: 'select', options: LEVELS, visible: analyzed },
  { key: 'analysis.interest', label: 'Interesse', type: 'select', options: LEVELS, visible: analyzed },
  { key: 'analysis.currentPosture', label: 'Engajamento atual', type: 'select', options: POSTURES, visible: analyzed },
  { key: 'analysis.desiredPosture', label: 'Engajamento desejado', type: 'select', options: POSTURES, visible: analyzed },
  { key: 'analysis.interests', label: 'Interesses e expectativas', type: 'textarea', visible: analyzed },
  { key: 'analysis.engagementStrategy', label: 'Estratégia de engajamento', type: 'textarea', visible: analyzed },
  {
    key: 'analysis.relationshipOwnerId',
    label: 'Responsável pelo relacionamento',
    type: 'reference',
    module: 'stakeholders',
    collection: 'parties',
    constraint: 'isPerson',
    visible: analyzed,
  },
];

const NEW_ANALYSIS: StakeholderAnalysis = {
  interests: '',
  power: 'Baixo',
  interest: 'Baixo',
  currentPosture: 'Neutro',
  desiredPosture: 'Apoiador',
  engagementStrategy: '',
  relationshipOwnerId: null,
};

const common = (v: Values) => ({
  id: v.id,
  code: v.code ?? '',
  name: v.name ?? '',
  contact: v.contact ?? '',
  internal: v.internal ?? 'Interno',
  notes: v.notes ?? '',
  analysis: v.analysis ?? null,
});

export const newPerson = (): Values => ({ ...common({}), kind: 'Pessoa', position: '', organizationId: null });

/** Trocar o tipo reconstrói o registro só com os campos do novo tipo (pessoa ≠ organização). */
const onDraftChange: DraftChange = (prev, next) => {
  // O interruptor "Analisar" grava `true`/`false`; vira o bloco de análise ou `null`.
  if (next.analysis === true) next = { ...next, analysis: { ...NEW_ANALYSIS } };
  if (next.analysis === false) next = { ...next, analysis: null };
  if (prev.kind === next.kind) return { value: next };
  return {
    value:
      next.kind === 'Organização'
        ? { ...common(next), kind: 'Organização', roles: [], taxId: '', country: 'Brasil' }
        : { ...common(next), kind: 'Pessoa', position: '', organizationId: null },
  };
};

export function PartiesPage() {
  const analysis = useAnalysis();
  const withAnalysis = analysis?.config.enabled.stakeholders ?? false;
  return (
    <RegisterView<Party>
      module="stakeholders"
      collection="parties"
      title="Pessoas e organizações"
      fields={withAnalysis ? [...fields, ...analysisFields] : fields}
      examples={partyExamples}
      newEntity={newPerson}
      onDraftChange={onDraftChange}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'name', label: 'Nome' },
        { key: 'kind', label: 'Tipo', render: (p) => <StatusBadge status={p.kind} /> },
        { key: 'detail', label: 'Cargo / papéis', render: (p) => (p.kind === 'Pessoa' ? p.position : p.roles.join(', ')) },
        { key: 'internal', label: 'Interno/externo' },
        ...(withAnalysis
          ? [
              {
                key: 'quadrant',
                label: 'Quadrante',
                render: (p: Party) => (p.analysis ? <StatusBadge status={quadrant(p.analysis)} /> : <span className="muted">—</span>),
              },
            ]
          : []),
      ]}
    />
  );
}
