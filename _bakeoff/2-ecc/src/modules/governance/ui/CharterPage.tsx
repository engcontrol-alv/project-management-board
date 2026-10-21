import { useState } from 'react';
import { Card } from '@/shared/ui/Card';
import { RecordForm, labelErrors, type FieldDef } from '@/registers/fields';
import { reopenProject, saveCharter } from '@/commands/project';
import { useCommand, useConfig, useReadOnly, useSnapshot } from '@/platform/react/hooks';
import type { ProjectSnapshot } from '@/project/snapshot';
import { PROJECT_STATUSES, type GovernanceProfile } from '../index';

type Draft = { info: ProjectSnapshot['project']['info']; charter: GovernanceProfile['charter']; closure: GovernanceProfile['closure'] };

function CharterForm({ snapshot, phases }: { snapshot: ProjectSnapshot; phases: string[] }) {
  const run = useCommand();
  const readOnly = useReadOnly();
  const { profile } = snapshot.governance;
  const [draft, setDraft] = useState<Draft>({ info: snapshot.project.info, charter: profile.charter, closure: profile.closure });
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const lessons = Object.keys(snapshot.governance.lessons).length;

  const charterFields: FieldDef[] = [
    { key: 'info.name', label: 'Nome do projeto', type: 'text' },
    { key: 'info.code', label: 'Código', type: 'text', hint: 'Até 12 caracteres.' },
    { key: 'info.startDate', label: 'Data de início', type: 'date' },
    { key: 'charter.clientId', label: 'Cliente', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isClientOrganization', hint: 'Organização com papel Cliente.' },
    { key: 'charter.sponsorId', label: 'Patrocinador', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'charter.managerId', label: 'Gerente', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
    { key: 'charter.objective', label: 'Objetivo', type: 'textarea' },
    { key: 'charter.justification', label: 'Justificativa', type: 'textarea' },
    { key: 'charter.currentPhase', label: 'Fase atual', type: 'select', options: phases },
    { key: 'charter.status', label: 'Status', type: 'select', options: PROJECT_STATUSES, hint: 'Encerrado exige termo assinado, data real e pendências vazias; o projeto fica somente leitura.' },
    { key: 'charter.approvalDate', label: 'Data de aprovação da abertura', type: 'date' },
  ];
  const closureFields: FieldDef[] = [
    { key: 'closure.plannedDate', label: 'Data prevista de encerramento', type: 'date' },
    { key: 'closure.actualDate', label: 'Data real de encerramento', type: 'date' },
    { key: 'closure.pendingItems', label: 'Pendências contratuais/financeiras', type: 'textarea' },
    { key: 'closure.closureTermSigned', label: 'Termo de encerramento assinado', type: 'boolean' },
  ];

  const save = async () => {
    const r = await run(saveCharter(draft.info, { ...profile, charter: draft.charter, closure: draft.closure }));
    setSaved(r.ok);
    setErrors(r.ok ? [] : labelErrors(r.error.map((e) => e.replace(/^(name|code|startDate):/, 'info.$1:')), [...charterFields, ...closureFields]));
  };
  const onChange = (v: Draft) => {
    setSaved(false);
    setDraft(v);
  };

  return (
    <>
      {readOnly && (
        <Card>
          <div className="tb-row" style={{ justifyContent: 'space-between' }}>
            <span>Projeto encerrado: toda a aplicação está somente leitura.</span>
            <button type="button" className="primary" onClick={() => run(reopenProject())}>
              Reabrir projeto
            </button>
          </div>
        </Card>
      )}
      <div className="tb-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <Card title="Abertura do projeto">
          <RecordForm fields={charterFields} value={draft} onChange={onChange} errors={errors} disabled={readOnly} />
        </Card>
        <Card title="Encerramento">
          <RecordForm fields={closureFields} value={draft} onChange={onChange} disabled={readOnly} />
          <div className="tb-field">
            <span>Lições registradas</span>
            <span data-testid="lessons-registered">{lessons > 0 ? `Sim (${lessons})` : 'Não'}</span>
            <span className="tb-hint">Derivado: existe ao menos uma lição aprendida.</span>
          </div>
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

export function CharterPage() {
  const snapshot = useSnapshot();
  const config = useConfig();
  if (!snapshot || !config) return null;
  const key = `${snapshot.project.id}|${snapshot.governance.profile.charter.status}`;
  return <CharterForm key={key} snapshot={snapshot} phases={config.settings.schedule.phases} />;
}
