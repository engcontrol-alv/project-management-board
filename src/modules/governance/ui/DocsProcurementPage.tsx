import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { upsertEntity } from '@/commands/entities';
import { useAnalysis, useCommand } from '@/platform/react/hooks';
import { RecordForm } from '@/registers/RecordForm';
import type { FieldDef, Values } from '@/registers/types';
import { isReadOnly } from '../domain/governance';
import { BILLING_MODES, PROCUREMENT_MODELS, SELECTION_CRITERIA, TEMPLATES } from '../model/profile';

export const OWN_REVENUE_NOTE = 'Contratações deste projeto não compõem receita própria.';

const templateFields: FieldDef[] = [
  {
    key: 'documentTemplate.template',
    label: 'Template de documentação',
    type: 'select',
    options: TEMPLATES,
    nullable: true,
    hint: 'Padrão herdado pelos entregáveis de documentação (cada um pode sobrescrever).',
  },
  { key: 'documentTemplate.notes', label: 'Observação', type: 'text', hint: 'Ex.: nome do padrão do cliente.' },
];

const procurementFields: FieldDef[] = [
  { key: 'procurementPolicy.model', label: 'Modalidade', type: 'select', options: PROCUREMENT_MODELS, nullable: true },
  { key: 'procurementPolicy.billing', label: 'Faturamento', type: 'select', options: BILLING_MODES, nullable: true },
  { key: 'procurementPolicy.criteria', label: 'Critérios de seleção', type: 'multiselect', options: SELECTION_CRITERIA },
  { key: 'procurementPolicy.approvalLimitCents', label: 'Alçada de aprovação (R$)', type: 'money' },
  { key: 'procurementPolicy.notes', label: 'Observações', type: 'textarea' },
];

export function DocsProcurementPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  return <DocsProcurementForm key={analysis.snapshot.project.updatedAt} />;
}

function DocsProcurementForm() {
  const analysis = useAnalysis()!;
  const command = useCommand();
  const profile = analysis.snapshot.governance.profile;
  const [value, setValue] = useState<Values>(() => structuredClone(profile));
  const [errors, setErrors] = useState<string[]>([]);
  const readOnly = isReadOnly(profile);
  const billing = (value.procurementPolicy as { billing: string | null }).billing;

  return (
    <div>
      <Card title="Documentos — template de documentação">
        <RecordForm fields={templateFields} value={value} onChange={setValue} errors={errors} disabled={readOnly} />
      </Card>
      <Card title="Estratégia de aquisições">
        {billing === 'Direto ao cliente' && <div className="info">{OWN_REVENUE_NOTE}</div>}
        <RecordForm fields={procurementFields} value={value} onChange={setValue} disabled={readOnly} />
        <p className="muted small">Os itens contratados ficam em Finanças (Etapa 2).</p>
      </Card>
      <button
        className="btn btn-primary"
        disabled={readOnly}
        onClick={async () => {
          const r = await command(upsertEntity('governance', 'profile', value as Values & { id: string }));
          setErrors(r.ok ? [] : r.error);
        }}
      >
        Salvar
      </button>
    </div>
  );
}
