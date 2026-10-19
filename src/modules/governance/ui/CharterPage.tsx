import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { reopenProject, saveCharter } from '@/commands/project';
import { useAnalysis, useCommand } from '@/platform/react/hooks';
import { RecordForm } from '@/registers/RecordForm';
import type { FieldDef, Values } from '@/registers/types';
import type { ProjectInfo } from '@/project/project';
import { isReadOnly } from '../domain/governance';
import { PROJECT_STATUSES, type GovernanceProfile } from '../model/profile';

export function CharterPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const s = analysis.snapshot;
  // Recria o formulário quando o projeto muda (salvo aqui ou em outra aba).
  return <CharterForm key={s.project.updatedAt} />;
}

function CharterForm() {
  const analysis = useAnalysis()!;
  const command = useCommand();
  const s = analysis.snapshot;
  const [value, setValue] = useState<Values>(() => structuredClone({ info: s.project.info, profile: s.governance.profile }));
  const [errors, setErrors] = useState<string[]>([]);
  const readOnly = isReadOnly(s.governance.profile);
  const lessons = Object.keys(s.governance.lessons).length;

  const fields: FieldDef[] = [
    { key: 'info.name', label: 'Nome do projeto', type: 'text' },
    { key: 'info.code', label: 'Código', type: 'text', hint: 'Até 12 caracteres.' },
    { key: 'info.startDate', label: 'Data de início', type: 'date', hint: 'Base do cálculo do cronograma.' },
    { key: 'profile.charter.clientId', label: 'Cliente', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isClientOrganization' },
    { key: 'profile.charter.sponsorId', label: 'Patrocinador', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'profile.charter.managerId', label: 'Gerente', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'profile.charter.currentPhase', label: 'Fase atual', type: 'select', options: analysis.config.settings.schedule.phases },
    { key: 'profile.charter.status', label: 'Status do projeto', type: 'select', options: PROJECT_STATUSES, hint: 'Encerrado exige termo assinado, data real e nenhuma pendência.' },
    { key: 'profile.charter.approvalDate', label: 'Data de aprovação da abertura', type: 'date' },
    { key: 'profile.charter.objective', label: 'Objetivo', type: 'textarea' },
    { key: 'profile.charter.justification', label: 'Justificativa', type: 'textarea' },
  ];
  const closureFields: FieldDef[] = [
    { key: 'profile.closure.plannedDate', label: 'Data prevista de encerramento', type: 'date' },
    { key: 'profile.closure.actualDate', label: 'Data real de encerramento', type: 'date' },
    { key: 'profile.closure.closureTermSigned', label: 'Termo de encerramento assinado', type: 'boolean' },
    { key: 'profile.closure.pendingItems', label: 'Pendências contratuais/financeiras', type: 'textarea' },
  ];

  const save = async () => {
    const r = await command(saveCharter(value.info as ProjectInfo, value.profile as GovernanceProfile));
    setErrors(r.ok ? [] : r.error);
  };

  return (
    <div>
      {readOnly && (
        <div className="notice row">
          Projeto encerrado: somente leitura.
          <button className="btn btn-sm" onClick={() => void command(reopenProject())}>
            Reabrir projeto
          </button>
        </div>
      )}
      <Card title="Abertura do projeto">
        <RecordForm fields={fields} value={value} onChange={setValue} errors={errors} disabled={readOnly} />
      </Card>
      <Card title="Encerramento">
        <RecordForm fields={closureFields} value={value} onChange={setValue} disabled={readOnly} />
        <p>
          Lições registradas: <strong>{lessons > 0 ? 'Sim' : 'Não'}</strong>{' '}
          <span className="muted small">(derivado: existe ao menos uma lição aprendida)</span>
        </p>
      </Card>
      <button className="btn btn-primary" disabled={readOnly} onClick={() => void save()}>
        Salvar ficha
      </button>
    </div>
  );
}
