import { formatMoneyBR } from '@/shared/lib/money';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { organizationAllowed, personAllowed, RESOURCE_TYPES, SKILL_LEVELS, type Resource } from '../model/resource';
import { resourceExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'name', label: 'Nome', type: 'text' },
  { key: 'type', label: 'Tipo', type: 'select', options: RESOURCE_TYPES },
  { key: 'role', label: 'Função', type: 'text', hint: 'Ex.: engenharia de automação, montagem elétrica.' },
  { key: 'skill', label: 'Competência', type: 'text' },
  { key: 'skillLevel', label: 'Nível', type: 'select', options: SKILL_LEVELS, nullable: true },
  { key: 'capacityPct', label: 'Capacidade (%)', type: 'number', min: 1, max: 100, integer: true, hint: 'Dedicação ao projeto; padrão 100.' },
  { key: 'hourlyRateCents', label: 'Custo homem-hora', type: 'money', hint: 'Moeda base; o custo/dia é derivado das horas/dia configuradas.' },
  {
    key: 'personId',
    label: 'Pessoa',
    type: 'reference',
    module: 'stakeholders',
    collection: 'parties',
    constraint: 'isPerson',
    visible: (v: Values) => personAllowed(v.type),
  },
  {
    key: 'organizationId',
    label: 'Organização',
    type: 'reference',
    module: 'stakeholders',
    collection: 'parties',
    constraint: 'isOrganization',
    visible: (v: Values) => organizationAllowed(v.type),
  },
];

const newResource = (): Values => ({
  code: '',
  name: '',
  type: 'Pessoa interna',
  role: '',
  skill: '',
  skillLevel: null,
  capacityPct: 100,
  hourlyRateCents: null,
  personId: null,
  organizationId: null,
});

export function ResourcesPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { baseCurrency } = analysis.config.settings.finances;
  const { hoursPerDay } = analysis.config.settings.resources;
  return (
    <RegisterView<Resource>
      module="resources"
      collection="resources"
      title="Recursos"
      fields={fields}
      examples={resourceExamples}
      newEntity={newResource}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        {
          key: 'name',
          label: 'Recurso',
          render: (r) => (
            <div>
              {r.name}
              <div className="subline">{[r.role, r.skill, r.skillLevel].filter(Boolean).join(' · ')}</div>
            </div>
          ),
        },
        { key: 'type', label: 'Tipo', render: (r) => <StatusBadge status={r.type} /> },
        { key: 'capacity', label: 'Capacidade', mono: true, render: (r) => `${r.capacityPct}%` },
        {
          key: 'rate',
          label: 'Custo homem-hora',
          render: (r) =>
            r.hourlyRateCents === null ? (
              <span className="muted">—</span>
            ) : (
              <span className="tb-mono">{`${formatMoneyBR(r.hourlyRateCents, baseCurrency)}/h`}</span>
            ),
        },
        {
          key: 'day',
          label: `Custo/dia (${hoursPerDay} h)`,
          render: (r) =>
            r.hourlyRateCents === null ? (
              <span className="muted">—</span>
            ) : (
              <span className="tb-mono">{`${formatMoneyBR(r.hourlyRateCents * hoursPerDay, baseCurrency)}/dia`}</span>
            ),
        },
      ]}
    />
  );
}
