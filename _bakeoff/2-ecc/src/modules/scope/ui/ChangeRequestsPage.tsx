import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PartyId } from '@/core/ids';
import { Badge } from '@/shared/ui/Badge';
import { Dialog } from '@/shared/ui/Dialog';
import { statusTone } from '@/shared/ui/tones';
import { formatDateBR } from '@/shared/lib/dates';
import { formatMoneyBR } from '@/shared/lib/money';
import { RegisterView } from '@/registers/RegisterView';
import { ReferencePicker } from '@/registers/ReferencePicker';
import type { FieldDef } from '@/registers/fields';
import { transitionChangeRequest } from '@/commands/change-requests';
import { applyChangeToBaseline } from '@/commands/baseline';
import { useCommand, useReadOnly, useSnapshot } from '@/platform/react/hooks';
import { useRepository } from '@/platform/react/RepositoryProvider';
import {
  CR_CATEGORIES,
  IMPACT_LEVELS,
  allowedCrTransitions,
  type ChangeRequest,
  type CrStatus,
} from '../index';
import { changeRequestExamples } from '../examples';

const ACTION_LABEL: Record<CrStatus, string> = {
  Solicitada: 'Solicitar',
  'Em análise': 'Enviar para análise',
  Aprovada: 'Aprovar',
  Rejeitada: 'Rejeitar',
  Implementada: 'Marcar implementada',
  Cancelada: 'Cancelar mudança',
};

const fields: FieldDef[] = [
  { key: 'title', label: 'Título', type: 'text', required: true },
  { key: 'description', label: 'Descrição', type: 'textarea' },
  { key: 'justification', label: 'Justificativa', type: 'textarea' },
  { key: 'requesterId', label: 'Solicitante', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  { key: 'requestDate', label: 'Data da solicitação', type: 'date' },
  { key: 'categories', label: 'Categorias afetadas', type: 'multiselect', options: CR_CATEGORIES },
  { key: 'scopeImpact', label: 'Impacto em escopo', type: 'textarea' },
  { key: 'affectedWorkPackageIds', label: 'Pacotes afetados', type: 'reference', module: 'scope', collection: 'wbs', multiple: true },
  { key: 'affectedDeliverableIds', label: 'Entregáveis afetados', type: 'reference', module: 'scope', collection: 'deliverables', multiple: true },
  { key: 'scheduleImpactDays', label: 'Impacto em prazo (dias)', type: 'number', integer: true, hint: 'Negativo = antecipação.' },
  { key: 'costImpactCents', label: 'Impacto em custo (moeda base)', type: 'money', hint: 'Negativo = economia. Ex.: R$ 12.500,00' },
  { key: 'impactLevel', label: 'Nível de impacto', type: 'select', options: IMPACT_LEVELS, nullable: true },
  { key: 'implementerId', label: 'Responsável pela implementação', type: 'reference', module: 'stakeholders', collection: 'parties', constraint: 'isPerson' },
  { key: 'status', label: 'Status', type: 'text', readOnly: true, hint: 'Altere pelos botões de transição na lista.' },
];

type Pending = { cr: ChangeRequest; to: CrStatus };

export function ChangeRequestsPage() {
  const snapshot = useSnapshot();
  const run = useCommand();
  const readOnly = useReadOnly();
  const { clock } = useRepository();
  const [params] = useSearchParams();
  const [pending, setPending] = useState<Pending | null>(null);
  const [approverId, setApproverId] = useState<string | null>(null);
  const [decisionDate, setDecisionDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const hasBaseline = (snapshot?.baselines.length ?? 0) > 0;

  const execute = async (cmd: Parameters<typeof run>[0]) => {
    const r = await run(cmd);
    setError(r.ok ? null : r.error.join(' '));
    return r.ok;
  };

  const startTransition = (cr: ChangeRequest, to: CrStatus) => {
    if (to === 'Aprovada' || to === 'Rejeitada') {
      setApproverId(cr.approverId);
      setDecisionDate(cr.decisionDate ?? clock.today());
      setPending({ cr, to });
      return;
    }
    void execute(transitionChangeRequest(cr.id, to));
  };

  const confirmDecision = async () => {
    if (!pending) return;
    const ok = await execute(
      transitionChangeRequest(pending.cr.id, pending.to, {
        approverId: approverId as PartyId,
        decisionDate: decisionDate,
      }),
    );
    if (ok) setPending(null);
  };

  const newCr = () =>
    ({
      id: '',
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
    }) as unknown as ChangeRequest;

  return (
    <>
      {error && (
        <div role="alert" className="tb-alert-box">
          {error}
        </div>
      )}
      <RegisterView<ChangeRequest>
        module="scope"
        collection="changeRequests"
        title="Controle de mudanças"
        openNew={params.get('nova') === '1'}
        columns={[
          { key: 'title', label: 'Mudança' },
          { key: 'requestDate', label: 'Solicitada em', mono: true, render: (c) => formatDateBR(c.requestDate) },
          {
            key: 'impact',
            label: 'Impacto',
            mono: true,
            render: (c) =>
              [
                c.scheduleImpactDays !== null ? `${c.scheduleImpactDays} d` : null,
                c.costImpactCents !== null ? formatMoneyBR(c.costImpactCents) : null,
              ]
                .filter(Boolean)
                .join(' · ') || '—',
          },
          { key: 'status', label: 'Status', render: (c) => <Badge text={c.status} tone={statusTone(c.status)} /> },
        ]}
        rowActions={(c) =>
          readOnly ? null : (
            <>
              {allowedCrTransitions(c.status)
                .filter((to) => !(to === 'Implementada' && hasBaseline))
                .map((to) => (
                  <button key={to} type="button" aria-label={`${ACTION_LABEL[to]} ${c.code}`} onClick={() => startTransition(c, to)}>
                    {ACTION_LABEL[to]}
                  </button>
                ))}
              {c.status === 'Aprovada' && hasBaseline && (
                <button type="button" className="primary" onClick={() => void execute(applyChangeToBaseline(c.id))}>
                  Aplicar à linha de base
                </button>
              )}
            </>
          )
        }
        fields={fields}
        examples={changeRequestExamples}
        newEntity={newCr}
      />
      <Dialog
        open={pending !== null}
        title={pending ? `${ACTION_LABEL[pending.to]} ${pending.cr.code}` : ''}
        onClose={() => setPending(null)}
      >
        <div className="tb-field">
          <label htmlFor="cr-approver">
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)' }}>Aprovador</span>
          </label>
          <ReferencePicker
            id="cr-approver"
            module="stakeholders"
            collection="parties"
            constraint="isPerson"
            value={approverId}
            onChange={setApproverId}
          />
        </div>
        <label className="tb-field">
          <span>Data da decisão</span>
          <input type="date" value={decisionDate} onChange={(e) => setDecisionDate(e.target.value)} />
        </label>
        <div className="tb-dialog-foot">
          <button type="button" onClick={() => setPending(null)}>
            Cancelar
          </button>
          <button type="button" className="primary" onClick={confirmDecision}>
            Confirmar
          </button>
        </div>
      </Dialog>
    </>
  );
}
