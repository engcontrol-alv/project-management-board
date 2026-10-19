import { formatDateBR } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import {
  DELIVERABLE_CATEGORIES,
  DOC_CATEGORIES,
  DOC_TEMPLATES,
  statusesFor,
  typesFor,
  type Deliverable,
  type DeliverableCategory,
} from '../model/deliverable';
import { deliverableProgress, effectiveTemplate } from '../domain/deliverables';
import { deliverableExamples } from '../examples';

export const CATEGORY_CHANGED_NOTICE = 'Campos incompatíveis com a nova categoria foram limpos.';

const isDoc = (v: Values) => DOC_CATEGORIES.includes(v.category as DeliverableCategory);

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
  return { value: v, notice: cleared && prev.category ? CATEGORY_CHANGED_NOTICE : undefined };
};

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
  ];

  return (
    <RegisterView<Deliverable>
      module="scope"
      collection="deliverables"
      title="Lista de entregáveis"
      fields={fields}
      examples={deliverableExamples}
      newEntity={newDeliverable}
      onDraftChange={onDraftChange}
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
        { key: 'plannedDate', label: 'Prevista', mono: true, render: (d) => formatDateBR(d.plannedDate) },
        { key: 'requirements', label: 'Requisitos', mono: true, render: (d) => requirementsOf(d.id) || '—' },
      ]}
    />
  );
}
