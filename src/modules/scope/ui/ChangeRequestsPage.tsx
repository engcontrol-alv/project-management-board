import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ChangeRequestId, PartyId } from '@/core/ids';
import { formatDateBR } from '@/shared/lib/dates';
import { formatMoneyBR } from '@/shared/lib/money';
import { StatusBadge } from '@/shared/ui/Badge';
import { Dialog, ErrorList } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/fields';
import { applyChangeToBaseline } from '@/commands/baseline';
import { transitionChangeRequest } from '@/commands/change-requests';
import { isClosed } from '@/commands/guard';
import { useCommand, useRepositoryContext, useSnapshot } from '@/platform/react/hooks';
import { RegisterView } from '@/registers/RegisterView';
import { ReferencePicker } from '@/registers/ReferencePicker';
import type { FieldDef, Values } from '@/registers/types';
import { CR_CATEGORIES, IMPACT_LEVELS, type ChangeRequest, type CrStatus } from '../model/change-request';
import { allowedCrTransitions } from '../domain/change-requests';
import { changeRequestExamples } from '../examples';

const fields: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text' },
  { key: 'requestDate', label: 'Data da solicitação', type: 'date' },
  { key: 'description', label: 'Descrição', type: 'textarea' },
  { key: 'justification', label: 'Justificativa', type: 'textarea' },
  { key: 'requesterId', label: 'Solicitante', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  { key: 'categories', label: 'Categorias afetadas', type: 'multiselect', options: CR_CATEGORIES },
  { key: 'scopeImpact', label: 'Impacto em escopo', type: 'textarea' },
  { key: 'affectedWorkPackageIds', label: 'Pacotes afetados', type: 'reference', module: 'scope', collection: 'wbs', multiple: true, constraint: 'isWorkPackage' },
  { key: 'affectedDeliverableIds', label: 'Entregáveis afetados', type: 'reference', module: 'scope', collection: 'deliverables', multiple: true },
  { key: 'scheduleImpactDays', label: 'Impacto em prazo (dias)', type: 'number', integer: true, hint: 'Negativo = antecipação.' },
  { key: 'costImpactCents', label: 'Impacto em custo (R$)', type: 'money', hint: 'Negativo = economia.' },
  { key: 'impactLevel', label: 'Nível', type: 'select', options: IMPACT_LEVELS, nullable: true },
  { key: 'implementerId', label: 'Responsável pela implementação', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
];

const NEEDS_DECISION: CrStatus[] = ['Aprovada', 'Rejeitada'];

export function ChangeRequestsPage() {
  const snapshot = useSnapshot();
  const command = useCommand();
  const { clock } = useRepositoryContext();
  const [params] = useSearchParams();
  const [errors, setErrors] = useState<string[]>([]);
  const [decision, setDecision] = useState<{ cr: ChangeRequest; to: CrStatus } | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);
  const [decisionDate, setDecisionDate] = useState('');
  const [decisionErrors, setDecisionErrors] = useState<string[]>([]);
  if (!snapshot) return null;
  const hasBaseline = snapshot.baselines.length > 0;
  const readOnly = isClosed(snapshot);

  const newCr = (): Values => ({
    code: '',
    title: '',
    description: '',
    justification: '',
    requesterId: null,
    requestDate: clock.today(),
    categories: [],
    scopeImpact: '',
    affectedWorkPackageIds: [],
    affectedDeliverableIds: [],
    scheduleImpactDays: null,
    costImpactCents: null,
    impactLevel: null,
    status: 'Solicitada',
    approverId: null,
    decisionDate: null,
    implementerId: null,
  });

  const transition = async (cr: ChangeRequest, to: CrStatus) => {
    if (NEEDS_DECISION.includes(to)) {
      setDecision({ cr, to });
      setApproverId(cr.approverId);
      setDecisionDate(cr.decisionDate ?? clock.today());
      setDecisionErrors([]);
      return;
    }
    const r = await command(transitionChangeRequest(cr.id, to));
    setErrors(r.ok ? [] : r.error);
  };

  const confirmDecision = async () => {
    if (!decision) return;
    if (!approverId || !decisionDate) return setDecisionErrors(['Informe o aprovador e a data da decisão.']);
    const r = await command(
      transitionChangeRequest(decision.cr.id, decision.to, {
        approverId: approverId as PartyId,
        decisionDate,
      }),
    );
    if (r.ok) setDecision(null);
    else setDecisionErrors(r.error);
  };

  const apply = async (id: ChangeRequestId) => {
    const r = await command(applyChangeToBaseline(id));
    setErrors(r.ok ? [] : r.error);
  };

  return (
    <>
      <ErrorList errors={errors} />
      <RegisterView<ChangeRequest>
        module="scope"
        collection="changeRequests"
        title="Controle de mudanças"
        fields={fields}
        examples={changeRequestExamples}
        newEntity={newCr}
        openNew={params.get('nova') === '1'}
        columns={[
          { key: 'code', label: 'Código', mono: true },
          { key: 'title', label: 'Mudança' },
          { key: 'requestDate', label: 'Solicitada em', mono: true, render: (c) => formatDateBR(c.requestDate) },
          { key: 'impact', label: 'Prazo / custo', mono: true, render: (c) => `${c.scheduleImpactDays ?? '—'} d · ${c.costImpactCents === null ? '—' : formatMoneyBR(c.costImpactCents)}` },
          { key: 'status', label: 'Status', render: (c) => <StatusBadge status={c.status} /> },
        ]}
        rowActions={(cr) =>
          readOnly ? null : (
            <>
              {allowedCrTransitions(cr.status)
                .filter((to) => !(to === 'Implementada' && hasBaseline))
                .map((to) => (
                  <button key={to} className="btn btn-sm" aria-label={`${to} ${cr.code}`} onClick={() => void transition(cr, to)}>
                    {to}
                  </button>
                ))}
              {cr.status === 'Aprovada' && hasBaseline && (
                <button className="btn btn-sm btn-primary" onClick={() => void apply(cr.id)}>
                  Aplicar à linha de base
                </button>
              )}
            </>
          )
        }
      />
      <Dialog
        open={decision !== null}
        title={`${decision?.to === 'Rejeitada' ? 'Rejeitar' : 'Aprovar'} ${decision?.cr.code ?? ''}`}
        onClose={() => setDecision(null)}
        actions={
          <>
            <button className="btn" onClick={() => setDecision(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={() => void confirmDecision()}>
              Confirmar decisão
            </button>
          </>
        }
      >
        <ErrorList errors={decisionErrors} />
        <Field id="decision-approver" label="Aprovador">
          <ReferencePicker
            id="decision-approver"
            label="Aprovador"
            module="stakeholders"
            collection="parties"
            constraint="isPerson"
            value={approverId}
            onChange={(v) => setApproverId(typeof v === 'string' ? v : null)}
          />
        </Field>
        <Field id="decision-date" label="Data da decisão">
          <input id="decision-date" type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} />
        </Field>
      </Dialog>
    </>
  );
}
