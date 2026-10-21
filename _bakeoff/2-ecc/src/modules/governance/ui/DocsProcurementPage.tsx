import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { RecordForm, labelErrors, type FieldDef } from '@/registers/fields';
import { upsertEntity } from '@/commands/entities';
import { useCommand, useReadOnly, useSnapshot } from '@/platform/react/hooks';
import {
  BILLING_OPTIONS,
  DOC_TEMPLATE_OPTIONS,
  PROCUREMENT_MODELS,
  SELECTION_CRITERIA,
  type GovernanceProfile,
} from '../index';

type Draft = Pick<GovernanceProfile, 'documentTemplate' | 'procurementPolicy'>;

const templateFields: FieldDef[] = [
  {
    key: 'documentTemplate.template',
    label: 'Template de documentação',
    type: 'select',
    options: DOC_TEMPLATE_OPTIONS,
    nullable: true,
    hint: 'Padrão herdado pelos entregáveis de documentação, que podem sobrescrevê-lo.',
  },
  { key: 'documentTemplate.notes', label: 'Observação do template', type: 'text', hint: 'Ex.: nome do padrão do cliente.' },
];
const policyFields: FieldDef[] = [
  { key: 'procurementPolicy.model', label: 'Modalidade', type: 'select', options: PROCUREMENT_MODELS, nullable: true },
  { key: 'procurementPolicy.billing', label: 'Faturamento', type: 'select', options: BILLING_OPTIONS, nullable: true },
  { key: 'procurementPolicy.criteria', label: 'Critérios de seleção', type: 'multiselect', options: SELECTION_CRITERIA },
  { key: 'procurementPolicy.approvalLimitCents', label: 'Alçada de aprovação', type: 'money', hint: 'Opcional. Ex.: R$ 50.000,00' },
  { key: 'procurementPolicy.notes', label: 'Observações', type: 'textarea' },
];

function DocsProcurementForm({ profile }: { profile: GovernanceProfile }) {
  const run = useCommand();
  const readOnly = useReadOnly();
  const [draft, setDraft] = useState<Draft>({ documentTemplate: profile.documentTemplate, procurementPolicy: profile.procurementPolicy });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const onChange = (v: Draft) => {
    setSaved(false);
    setDraft(v);
  };
  const save = async () => {
    const r = await run(upsertEntity('governance', 'profile', { ...profile, ...draft }));
    setSaved(r.ok);
    setErrors(r.ok ? [] : labelErrors(r.error, [...templateFields, ...policyFields]));
  };
  return (
    <>
      <div className="tb-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card title="Documentos — template de documentação">
          <RecordForm fields={templateFields} value={draft} onChange={onChange} errors={errors} disabled={readOnly} />
        </Card>
        <Card title="Estratégia de aquisições">
          <RecordForm fields={policyFields} value={draft} onChange={onChange} disabled={readOnly} />
          {draft.procurementPolicy.billing === 'Direto ao cliente' && (
            <p className="tb-card" style={{ background: 'var(--blue-soft)' }}>
              Contratações deste projeto não compõem receita própria.
            </p>
          )}
          <p className="tb-hint">Os itens contratados ficam em Finanças (Etapa 2).</p>
        </Card>
      </div>
      {!readOnly && (
        <div className="tb-row">
          <button type="button" className="primary" onClick={save}>
            Salvar
          </button>
          {saved && <span className="tb-hint">Salvo.</span>}
        </div>
      )}
    </>
  );
}

export function DocsProcurementPage() {
  const snapshot = useSnapshot();
  if (!snapshot) return null;
  return <DocsProcurementForm key={snapshot.project.id} profile={snapshot.governance.profile} />;
}
