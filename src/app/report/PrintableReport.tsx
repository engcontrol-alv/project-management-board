import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { AnalysisContext } from '@/analytics/alerts/types';
import { computeDashboard } from '@/analytics/dashboard';
import { currentBaseline } from '@/analytics/derive';
import { formatDateBR, type IsoDate } from '@/shared/lib/dates';
import { RagDot } from '@/shared/ui/Badge';
import { REPORT_SECTIONS, type ReportRequest } from './report-config';
import { SECTION_BODY } from './report-sections';

/**
 * Relatório Executivo A4: portal no body, fora da árvore do app. Na impressão o CSS esconde o app
 * (`body:has(.executive-print-report) > #root`), então sai igual qualquer que seja a aba de fundo.
 */
export function PrintableReport({
  analysis,
  request,
  issuedOn,
  printOnOpen,
  onClose,
}: {
  analysis: AnalysisContext;
  request: ReportRequest;
  issuedOn: IsoDate;
  printOnOpen: boolean;
  onClose: () => void;
}) {
  // Imprime depois que o relatório está no DOM (uma vez por emissão).
  useEffect(() => {
    if (printOnOpen) window.print();
  }, [printOnOpen]);

  const dash = computeDashboard(analysis);
  const ctx = { ...analysis, dash };
  const { snapshot, derived } = analysis;
  const { charter } = snapshot.governance.profile;
  const name = (id: string | null) =>
    (id && snapshot.stakeholders.parties[id as keyof typeof snapshot.stakeholders.parties]?.name) || '—';
  const baseline = currentBaseline(snapshot);
  const stamp: [string, ReactNode][] = [
    ['Código', <span className="tb-mono">{snapshot.project.info.code}</span>],
    ['Projeto', snapshot.project.info.name],
    ['Cliente', name(charter.clientId)],
    ['Gerente', name(charter.managerId)],
    ['Data de status', <span className="tb-mono">{formatDateBR(derived.statusDate)}</span>],
    ['Data de emissão', <span className="tb-mono">{formatDateBR(issuedOn)}</span>],
    ['Linha de base', <span className="tb-mono">{baseline ? `v${baseline.version}` : 'não definida'}</span>],
    ['Situação geral', <RagDot rag={dash.overall} />],
  ];

  return createPortal(
    <div className="report-preview">
      <div className="report-toolbar no-print" role="toolbar" aria-label="Pré-visualização do relatório">
        <span className="small muted">Pré-visualização · A4 retrato</span>
        <button className="btn btn-sm btn-primary" onClick={() => window.print()}>
          <Printer size={14} aria-hidden="true" /> Imprimir
        </button>
        <button className="btn btn-sm" onClick={onClose}>
          <X size={14} aria-hidden="true" /> Fechar
        </button>
      </div>
      <article className="executive-print-report" aria-label="Relatório executivo A4">
        <header className="report-head">
          <div className="eyebrow">Relatório executivo</div>
          <h1>{snapshot.project.info.name}</h1>
        </header>
        <section className="report-stamp" aria-label="Carimbo técnico">
          {stamp.map(([k, v]) => (
            <div key={k} className="stamp-cell">
              <span className="tb-caption">{k}</span>
              <span className="stamp-value">{v}</span>
            </div>
          ))}
        </section>
        {request.notes && (
          <section className="report-notes" aria-label="Observações executivas">
            <div className="eyebrow">Observações executivas</div>
            <p>{request.notes}</p>
          </section>
        )}
        {REPORT_SECTIONS.filter((s) => request.sections.has(s.id)).map((s) => (
          <section key={s.id} className="report-section" aria-label={s.title}>
            <h2>{s.title}</h2>
            {SECTION_BODY[s.id](ctx)}
          </section>
        ))}
      </article>
    </div>,
    document.body,
  );
}
