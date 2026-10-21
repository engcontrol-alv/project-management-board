import { Badge } from '@/shared/ui/Badge';
import { statusTone } from '@/shared/ui/tones';
import { formatDateBR } from '@/shared/lib/dates';
import { RegisterView } from '@/registers/RegisterView';
import type { FieldDef } from '@/registers/fields';
import { useConfig, useSnapshot } from '@/platform/react/hooks';
import {
  DELIVERABLE_CATEGORIES,
  TEMPLATES,
  isDocumentCategory,
  statusesFor,
  typesFor,
  type Deliverable,
} from '../index';
import { deliverableExamples } from '../examples';

type Draft = Record<string, unknown> & { id: string };

const isDoc = (v: Draft) => isDocumentCategory(String(v.category ?? ''));

const newDeliverable = () =>
  ({
    id: '',
    code: '',
    name: '',
    category: '',
    type: '',
    status: '',
    revision: '0',
    template: null,
    workPackageId: null,
    milestoneId: null,
    plannedDate: null,
    actualDate: null,
    ownerId: null,
    clientApproval: false,
  }) as unknown as Deliverable;

const CLEARED_NOTICE = 'Campos incompatíveis com a nova categoria foram limpos.';

/** Trocar a categoria limpa tipo, status, revisão e template incompatíveis. */
export function onCategoryChange(prev: Deliverable, nextValue: Deliverable): { value: Deliverable; notice?: string } {
  const p = prev as unknown as Draft;
  const n = { ...(nextValue as unknown as Draft) };
  if (p.category === n.category) return { value: nextValue };
  const category = String(n.category ?? '');
  let cleared = false;
  if (n.type && !typesFor(category).includes(String(n.type))) {
    n.type = '';
    cleared = true;
  }
  if (n.status && !statusesFor(category).includes(String(n.status))) {
    n.status = '';
    cleared = true;
  }
  if (isDocumentCategory(category)) {
    n.revision ??= '0';
    if (!('template' in n)) n.template = null;
  } else if ('revision' in n || 'template' in n) {
    if ((n.revision && n.revision !== '0') || n.template) cleared = true;
    delete n.revision;
    delete n.template;
  }
  return { value: n as unknown as Deliverable, notice: cleared && p.category ? CLEARED_NOTICE : undefined };
}

export function DeliverablesPage() {
  const snapshot = useSnapshot();
  const config = useConfig();
  const govTemplate = snapshot?.governance.profile.documentTemplate.template ?? null;

  const fields: FieldDef[] = [
    { key: 'name', label: 'Nome', type: 'text', required: true },
    { key: 'category', label: 'Categoria', type: 'select', options: DELIVERABLE_CATEGORIES, required: true },
    { key: 'type', label: 'Tipo', type: 'select', options: (v: Draft) => typesFor(String(v.category ?? '')) },
    { key: 'revision', label: 'Revisão', type: 'text', visible: isDoc, hint: 'Ex.: 0, A, B…' },
    {
      key: 'template',
      label: 'Template',
      type: 'select',
      options: TEMPLATES,
      nullable: true,
      visible: isDoc,
      hint: `Vazio = herda da Governança (${govTemplate ?? 'não definido'}).`,
    },
    { key: 'status', label: 'Status', type: 'select', options: (v: Draft) => statusesFor(String(v.category ?? '')) },
    { key: 'workPackageId', label: 'Pacote que o produz', type: 'reference', module: 'scope', collection: 'wbs', constraint: 'isWorkPackage' },
    ...(config?.enabled.schedule
      ? [{ key: 'milestoneId', label: 'Marco associado', type: 'reference', module: 'schedule', collection: 'milestones' } as FieldDef]
      : []),
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
      description={
        <p className="tb-hint" style={{ fontSize: 13 }}>
          Template de documentação: {govTemplate ?? 'não definido'}
        </p>
      }
      columns={[
        { key: 'name', label: 'Entregável' },
        { key: 'category', label: 'Categoria' },
        { key: 'type', label: 'Tipo' },
        {
          key: 'template',
          label: 'Template',
          render: (d) => {
            if (!isDocumentCategory(d.category)) return '—';
            if ('template' in d && d.template) return d.template;
            return govTemplate ? <em title="Herdado da Governança">{govTemplate}</em> : '—';
          },
        },
        { key: 'plannedDate', label: 'Prevista', mono: true, render: (d) => formatDateBR(d.plannedDate) },
        { key: 'status', label: 'Status', render: (d) => <Badge text={d.status} tone={statusTone(d.status)} /> },
      ]}
      fields={fields}
      examples={deliverableExamples}
      newEntity={newDeliverable}
      transform={onCategoryChange}
    />
  );
}
