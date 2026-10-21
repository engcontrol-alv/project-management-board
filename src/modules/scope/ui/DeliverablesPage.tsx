import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { Badge, StatusBadge } from '@/shared/ui/Badge';
import type { Tone } from '@/shared/ui/tones';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import {
  DELIVERABLE_CATEGORIES,
  DOC_CATEGORIES,
  DOC_TEMPLATES,
  statusesFor,
  TEST_STATUSES,
  type TestStatus,
  typesFor,
  type Deliverable,
  type DeliverableCategory,
} from '../model/deliverable';
import { deliverableProgress, effectiveTemplate } from '../domain/deliverables';
import { acceptanceIssues, defaultTestStatus } from '../domain/acceptance';
import { deliverableExamples } from '../examples';

export const CATEGORY_CHANGED_NOTICE = 'Campos incompatíveis com a nova categoria foram limpos.';

const isDoc = (v: Values) => DOC_CATEGORIES.includes(v.category as DeliverableCategory);
const isPhysical = (v: Values) => v.category === 'Entregável físico / serviço';

const TESTS = [
  ['fat', 'TAF/FAT'],
  ['sat', 'TAC/SAT'],
] as const;

const TEST_TONE: Record<TestStatus, Tone> = {
  'Não Aplicável': 'gray',
  Pendente: 'gray',
  Aprovado: 'green',
  'Aprovado com Ressalvas': 'amber',
  Reprovado: 'red',
};

const newDeliverable = (): Values => ({
  code: '',
  name: '',
  category: '',
  type: '',
  status: '',
  workPackageId: null,
  milestoneId: null,
  plannedDate: null,
  actualDate: null,
  ownerId: null,
  clientApproval: false,
});

/** Trocar a categoria limpa tipo, status, revisão e template incompatíveis, com aviso. */
const onDraftChange: DraftChange = (prev, next) => {
  if (prev.category === next.category) return { value: next };
  const cat = String(next.category);
  const v: Values = { ...next };
  let cleared = false;
  if (v.type && !typesFor(cat).includes(String(v.type))) {
    v.type = '';
    cleared = true;
  }
  if (v.status && !statusesFor(cat).includes(String(v.status))) {
    v.status = '';
    cleared = true;
  }
  if (!v.status && !prev.category) v.status = 'Não iniciado';
  if (isDoc(v)) {
    v.revision = v.revision ?? '0';
    v.template = v.template ?? null;
  } else {
    if (v.revision || v.template) cleared = true;
    delete v.revision;
    delete v.template;
  }
  if (isPhysical(v)) {
    for (const [k] of TESTS) {
      v[`${k}Status`] = v[`${k}Status`] ?? defaultTestStatus(String(v.type ?? ''));
      v[`${k}Date`] = v[`${k}Date`] ?? null;
    }
  } else {
    for (const [k] of TESTS) {
      if (`${k}Status` in v && (v[`${k}Status`] !== 'Não Aplicável' || v[`${k}Date`])) cleared = true;
      delete v[`${k}Status`];
      delete v[`${k}Date`];
    }
  }
  return { value: v, notice: cleared && prev.category ? CATEGORY_CHANGED_NOTICE : undefined };
};

/** Tipo industrial novo leva o teste ainda no padrão do tipo anterior ao padrão do novo; "Não Aplicável" limpa a data. */
const onTestsChange = (prev: Values, next: Values): Values => {
  if (!isPhysical(next) || !isPhysical(prev)) return next;
  const v: Values = { ...next };
  for (const [k] of TESTS) {
    if (prev.type !== v.type && prev[`${k}Status`] === defaultTestStatus(String(prev.type ?? '')))
      v[`${k}Status`] = defaultTestStatus(String(v.type ?? ''));
    if (v[`${k}Status`] === 'Não Aplicável') v[`${k}Date`] = null;
  }
  return v;
};

const onChange: DraftChange = (prev, next) => onDraftChange(prev, onTestsChange(prev, next));

function TestsCell({ d }: { d: Deliverable }) {
  if (d.category !== 'Entregável físico / serviço') return <span className="muted">—</span>;
  if (d.fatStatus === 'Não Aplicável' && d.satStatus === 'Não Aplicável') return <span className="muted">Não aplicável</span>;
  const done = d.status === 'Aceito pelo cliente' ? 'Aceito' : 'Concluído';
  return (
    <span className="row" style={{ gap: 4 }}>
      {TESTS.map(([k, label]) => {
        const status = d[`${k}Status`];
        return status === 'Não Aplicável' ? null : (
          <Badge key={k} text={`${label.slice(0, 3)} ${status}`} tone={TEST_TONE[status]} />
        );
      })}
      {acceptanceIssues(d).map((i) => (
        <Badge key={i.test} text={`${done} com ${i.test} ${i.status}`} tone={i.severity === 'vermelho' ? 'red' : 'gold'} dot />
      ))}
    </span>
  );
}

export function DeliverablesPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot } = analysis;
  const govTemplate = snapshot.governance.profile.documentTemplate.template;
  const progress = deliverableProgress(Object.values(snapshot.scope.deliverables));
  const requirementsOf = (id: string) =>
    Object.values(snapshot.scope.requirements)
      .filter((r) => (r.deliverableIds as string[]).includes(id))
      .map((r) => r.code)
      .join(', ');

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nome', type: 'text' },
    { key: 'category', label: 'Categoria', type: 'select', options: DELIVERABLE_CATEGORIES, hint: 'Obrigatória; define os tipos e status disponíveis.' },
    { key: 'type', label: 'Tipo', type: 'select', options: (v) => typesFor(String(v.category ?? '')) },
    { key: 'status', label: 'Status', type: 'select', options: (v) => statusesFor(String(v.category ?? '')) },
    { key: 'revision', label: 'Revisão', type: 'text', visible: isDoc, hint: 'Ex.: 0, A, B…' },
    {
      key: 'template',
      label: 'Template',
      type: 'select',
      options: DOC_TEMPLATES,
      nullable: true,
      visible: isDoc,
      hint: `Vazio = herda da Governança (${govTemplate ?? 'não definido'}).`,
    },
    { key: 'workPackageId', label: 'Pacote de trabalho', type: 'reference', module: 'scope', collection: 'wbs', constraint: 'isWorkPackage' },
    { key: 'milestoneId', label: 'Marco', type: 'reference', module: 'schedule', collection: 'milestones' },
    { key: 'plannedDate', label: 'Data prevista', type: 'date' },
    { key: 'actualDate', label: 'Data real', type: 'date' },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'clientApproval', label: 'Exige aprovação do cliente', type: 'boolean' },
    ...TESTS.flatMap(([k, label]): FieldDef[] => [
      {
        key: `${k}Status`,
        label: `${label} — status`,
        type: 'select',
        options: TEST_STATUSES,
        visible: isPhysical,
        hint: k === 'fat' ? 'Teste de Aceitação em Fábrica.' : 'Teste de Aceitação em Campo.',
      },
      {
        key: `${k}Date`,
        label: `${label} — data`,
        type: 'date',
        visible: (v) => isPhysical(v) && v[`${k}Status`] !== 'Não Aplicável',
        hint: 'Obrigatória para Aprovado, Aprovado com Ressalvas e Reprovado; em Pendente, a data prevista.',
      },
    ]),
  ];

  return (
    <RegisterView<Deliverable>
      module="scope"
      collection="deliverables"
      title="Lista de entregáveis"
      fields={fields}
      examples={deliverableExamples}
      newEntity={newDeliverable}
      onDraftChange={onChange}
      summary={
        <div className="card">
          <p>
            Template de documentação: <strong>{govTemplate ?? 'não definido'}</strong>
          </p>
          <div className="grid">
            {DELIVERABLE_CATEGORIES.map((c) => (
              <div key={c} className="small">
                <div className="muted">{c}</div>
                <span className="tb-mono">
                  {progress[c].done}/{progress[c].total} · {formatPercent(progress[c].percent)}
                </span>
              </div>
            ))}
          </div>
        </div>
      }
      columns={[
        { key: 'code', label: 'Código', mono: true },
        { key: 'name', label: 'Entregável' },
        { key: 'category', label: 'Categoria' },
        { key: 'type', label: 'Tipo' },
        {
          key: 'template',
          label: 'Template',
          render: (d) => {
            const t = effectiveTemplate(d, govTemplate);
            if (!t) return '—';
            return 'template' in d && d.template === null ? <em title="Herdado da Governança">{t} (herdado)</em> : t;
          },
        },
        { key: 'status', label: 'Status', render: (d) => <StatusBadge status={d.status} /> },
        { key: 'tests', label: 'TAF / TAC', render: (d) => <TestsCell d={d} /> },
        { key: 'plannedDate', label: 'Prevista', mono: true, render: (d) => formatDateBR(d.plannedDate) },
        { key: 'requirements', label: 'Requisitos', mono: true, render: (d) => requirementsOf(d.id) || '—' },
      ]}
    />
  );
}
