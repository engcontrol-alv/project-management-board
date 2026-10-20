import { formatDateBR } from '@/shared/lib/dates';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';
import { RegisterView, type DraftChange } from '@/registers/RegisterView';
import type { FieldDef, Values } from '@/registers/types';
import { exposure } from '../domain/exposure';
import { IMPACT_LABELS, PROBABILITY_LABELS, responsesFor, RISK_NATURES, RISK_STATUSES, type Risk } from '../model/risk';
import { riskExamples } from '../examples';
import { ExposureBadge } from './ExposureBadge';

const level = (hint: string) => ({ type: 'number' as const, min: 1, max: 3, integer: true, hint });

/** Trocar ameaça ↔ oportunidade limpa uma resposta que não se aplica mais. */
const onDraftChange: DraftChange = (prev, next) => {
  if (prev.nature === next.nature || !next.responseType) return { value: next };
  if (responsesFor(String(next.nature)).includes(String(next.responseType))) return { value: next };
  return { value: { ...next, responseType: null }, notice: 'A resposta escolhida não se aplica e foi limpa.' };
};

export function RisksPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { config } = analysis;
  const settings = config.settings.risks;
  const many = (key: string, label: string, module: 'scope' | 'schedule' | 'finances' | 'stakeholders', collection: string, constraint?: string): FieldDef => ({
    key,
    label,
    type: 'reference',
    module,
    collection,
    multiple: true,
    constraint,
  });

  const fields: FieldDef[] = [
    { key: 'title', label: 'Título', type: 'text', wide: true },
    { key: 'nature', label: 'Ameaça ou oportunidade', type: 'select', options: RISK_NATURES },
    { key: 'category', label: 'Categoria', type: 'select', options: settings.categories },
    { key: 'description', label: 'Descrição', type: 'textarea' },
    { key: 'rootCause', label: 'Causa raiz', type: 'textarea' },
    { key: 'probability', label: 'Probabilidade (1–3)', ...level('1 = baixa · 2 = média · 3 = alta. Vazio = não avaliado.') },
    { key: 'impact', label: 'Impacto (1–3)', ...level('1 = baixo · 2 = médio · 3 = alto.') },
    {
      key: 'responseType',
      label: 'Tipo de resposta',
      type: 'select',
      nullable: true,
      options: (v) => responsesFor(String(v.nature)),
    },
    { key: 'responseAction', label: 'Ação de resposta', type: 'textarea', hint: '"Em mitigação" exige tipo de resposta e ação.' },
    { key: 'status', label: 'Status', type: 'select', options: RISK_STATUSES },
    { key: 'ownerId', label: 'Responsável', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'nextReview', label: 'Próxima revisão', type: 'date' },
    { key: 'probabilityPct', label: 'Probabilidade (%)', type: 'number', min: 0, max: 100, hint: 'Opcional, para o valor esperado.' },
    { key: 'costImpactCents', label: 'Impacto em custo', type: 'money' },
    { key: 'scheduleImpactDays', label: 'Impacto em prazo (dias)', type: 'number', integer: true },
    many('workPackageIds', 'Pacotes', 'scope', 'wbs', 'isWorkPackage'),
    many('milestoneIds', 'Marcos', 'schedule', 'milestones'),
    many('deliverableIds', 'Entregáveis', 'scope', 'deliverables'),
    many('procurementIds', 'Contratações', 'finances', 'procurements'),
    many('partyIds', 'Partes interessadas', 'stakeholders', 'parties'),
    { key: 'notes', label: 'Observações', type: 'textarea' },
  ];
  const newRisk = (): Values => ({
    code: '',
    title: '',
    nature: 'Ameaça',
    category: settings.categories[0] ?? '',
    description: '',
    rootCause: '',
    probability: null,
    impact: null,
    responseType: null,
    responseAction: '',
    ownerId: null,
    status: 'Identificado',
    nextReview: null,
    notes: '',
    probabilityPct: null,
    costImpactCents: null,
    scheduleImpactDays: null,
    workPackageIds: [],
    milestoneIds: [],
    deliverableIds: [],
    procurementIds: [],
    partyIds: [],
  });

  return (
    <RegisterView<Risk>
      module="risks"
      collection="risks"
      title="Registro de riscos"
      fields={fields}
      examples={riskExamples}
      newEntity={newRisk}
      onDraftChange={onDraftChange}
      columns={[
        { key: 'code', label: 'Código', mono: true },
        {
          key: 'title',
          label: 'Risco',
          render: (r) => (
            <div>
              {r.title}
              <div className="subline">{r.category}</div>
            </div>
          ),
        },
        { key: 'nature', label: 'Natureza', render: (r) => <StatusBadge status={r.nature} /> },
        {
          key: 'pi',
          label: 'P × I',
          mono: true,
          render: (r) =>
            r.probability && r.impact ? `${PROBABILITY_LABELS[r.probability]} × ${IMPACT_LABELS[r.impact]}` : '—',
        },
        { key: 'exposure', label: 'Exposição', render: (r) => <ExposureBadge value={exposure(r, settings)} /> },
        { key: 'response', label: 'Resposta', render: (r) => r.responseType ?? <span className="muted">—</span> },
        { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
        { key: 'nextReview', label: 'Revisão', mono: true, render: (r) => formatDateBR(r.nextReview) },
      ]}
    />
  );
}
