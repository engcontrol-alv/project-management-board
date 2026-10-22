import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { upsertEntity } from '@/commands/entities';
import { useAnalysis, useCommand } from '@/platform/react/hooks';
import { RecordForm } from '@/registers/RecordForm';
import { getPath, type FieldDef, type Values } from '@/registers/types';
import { isReadOnly } from '../domain/governance';
import { PENALTY_BASES, PENALTY_PERIODS } from '../model/profile';

const on = (v: Values) => getPath(v, 'latePenalty.enabled') === true;

const penaltyFields: FieldDef[] = [
  { key: 'latePenalty.enabled', label: 'Aplicar multa por atraso', type: 'boolean', wide: true },
  {
    key: 'latePenalty.ratePct',
    label: 'Multa por período (%)',
    type: 'number',
    min: 0,
    max: 100,
    visible: on,
    hint: 'Percentual do valor-base por período de atraso (ex.: 0,1).',
  },
  { key: 'latePenalty.period', label: 'Período', type: 'select', options: PENALTY_PERIODS, visible: on, hint: 'Semanal conta semana ou fração.' },
  {
    key: 'latePenalty.base',
    label: 'Base de cálculo',
    type: 'select',
    options: PENALTY_BASES,
    visible: on,
    hint: 'Valor do marco = receitas de Finanças vinculadas ao marco.',
  },
  { key: 'latePenalty.contractValueCents', label: 'Valor do contrato', type: 'money', visible: on, hint: 'Na moeda base do projeto.' },
  {
    key: 'latePenalty.capPct',
    label: 'Teto (% do valor do contrato)',
    type: 'number',
    min: 0,
    max: 100,
    visible: on,
    hint: 'Limite do total das multas. Vazio = sem teto.',
  },
  { key: 'latePenalty.notes', label: 'Texto da cláusula', type: 'textarea', visible: on, wide: true },
];

/** Definições contratuais (D8): cláusula de multa por atraso dos marcos contratuais. */
export function ContractPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  return <ContractForm key={analysis.snapshot.project.updatedAt} />;
}

function ContractForm() {
  const analysis = useAnalysis()!;
  const command = useCommand();
  const profile = analysis.snapshot.governance.profile;
  const [value, setValue] = useState<Values>(() => structuredClone(profile));
  const [errors, setErrors] = useState<string[]>([]);
  const readOnly = isReadOnly(profile);

  return (
    <div>
      <Card title="Multa contratual por atraso">
        <p className="muted small">
          Vale para os marcos do tipo <strong>Contratual</strong>. O prazo é a data do marco na linha de base vigente (sem
          linha de base, a data manual). A provisão aparece em Finanças e na aba Geral.
        </p>
        <RecordForm fields={penaltyFields} value={value} onChange={setValue} errors={errors} disabled={readOnly} />
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
