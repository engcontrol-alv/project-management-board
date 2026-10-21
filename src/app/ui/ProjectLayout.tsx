import { useLayoutEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  CalendarRange,
  HardDrive,
  HardHat,
  LayoutDashboard,
  ListTree,
  Printer,
  Settings,
  ShieldAlert,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { formatDateBR } from '@/shared/lib/dates';
import { RagDot, StatusBadge } from '@/shared/ui/Badge';
import { computeDashboard } from '@/analytics/dashboard';
import { isReadOnly } from '@/modules/governance';
import { reopenProject, setStatusDate } from '@/commands/project';
import { useAnalysis, useCommand, useLoadResult, useRepositoryContext } from '@/platform/react/hooks';
import { MANIFESTS, MODULE_ORDER, type ImplementedModuleId } from '@/project/registry';
import { VIEWS } from '../registry';
import { PrintableReport } from '../report/PrintableReport';
import { ReportComposer } from '../report/ReportComposer';
import type { ReportRequest } from '../report/report-config';
import { useAppActions } from '../shell';
import { DataMenu } from './DataMenu';
import { RecoveryPage } from './RecoveryPage';

const MODULE_ICONS: Record<ImplementedModuleId, LucideIcon> = {
  governance: LayoutDashboard,
  scope: ListTree,
  schedule: CalendarRange,
  finances: Wallet,
  risks: ShieldAlert,
  resources: HardHat,
  stakeholders: Users,
};

/** Mira/bússola técnica da aba "Geral": círculo externo, marcações cardeais sutis e centro. */
function TargetIcon() {
  return (
    <svg
      className="icon-target"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="5.75" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
      <circle cx="8" cy="8" r="1" />
    </svg>
  );
}

type DomainTab ={ id: string; label: string; to: string; icon: LucideIcon; active: boolean };

export function ProjectLayout() {
  const load = useLoadResult();
  const analysis = useAnalysis();
  const command = useCommand();
  const actions = useAppActions();
  const { clock } = useRepositoryContext();
  const location = useLocation();
  const domainBar = useRef<HTMLElement>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  // Cada emissão remonta o relatório (`seq`), para imprimir de novo com a mesma seleção.
  const [issued, setIssued] = useState<{ seq: number; request: ReportRequest; print: boolean } | null>(null);

  // Em telas estreitas, mantém a aba ativa visível dentro da faixa rolável.
  useLayoutEffect(() => {
    const active = domainBar.current?.querySelector<HTMLElement>('[aria-current="page"]');
    active?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [location.pathname]);

  if (!load) return <p className="main muted">Carregando…</p>;
  if (load.status === 'corrompido')
    return <RecoveryPage errors={load.errors} raw={load.raw} today={clock.today()} onClear={() => void actions.clearAll()} />;
  if (load.status === 'vazio' || !analysis)
    return <p className="main muted">Nenhum projeto neste navegador. Recarregue a página.</p>;

  const s = analysis.snapshot;
  const dash = computeDashboard(analysis);
  const readOnly = isReadOnly(s.governance.profile);
  const [, , current, currentSection] = location.pathname.split('/');

  const tabs: DomainTab[] = MODULE_ORDER.filter((id) => analysis.config.enabled[id] && VIEWS[id].sections.length > 0).map(
    (id) => ({
      id,
      label: MANIFESTS[id].label,
      to: `/projeto/${id}/${VIEWS[id].sections[0]?.path ?? ''}`,
      icon: MODULE_ICONS[id],
      active: current === id,
    }),
  );
  // Com o módulo desligado, o cadastro de pessoas e organizações continua acessível (SPEC §6.7).
  if (!analysis.config.enabled.stakeholders)
    tabs.push({
      id: 'pessoas',
      label: MANIFESTS.stakeholders.label,
      to: '/projeto/pessoas',
      icon: MODULE_ICONS.stakeholders,
      active: current === 'pessoas',
    });
  const activeModule = MODULE_ORDER.find((id) => id === current && analysis.config.enabled[id]);
  const sections = activeModule ? VIEWS[activeModule].sections : [];

  return (
    <div className="shell">
      <header className="app-header">
        {/* Linha 1 como carimbo de desenho técnico: células com divisórias de 1px. */}
        <div className="topbar tb-titleblock">
          <div className="tb-cell tb-cell-code">
            <span className="tb-caption">Código</span>
            <span className="code-chip">{s.project.info.code}</span>
          </div>
          <div className="tb-cell tb-cell-name project">
            <span className="tb-caption">Projeto</span>
            <strong title={s.project.info.name}>{s.project.info.name}</strong>
          </div>
          <div className="tb-cell tb-cell-status">
            <span className="tb-caption">Status</span>
            <span className="tb-cell-row">
              <StatusBadge status={s.governance.profile.charter.status} />
              <RagDot rag={dash.overall} />
            </span>
          </div>
          <label className="tb-cell status-date">
            <span className="tb-caption">Data de status</span>
            <span className="tb-cell-row">
              <input
                type="date"
                className={`input${s.project.statusDate ? '' : ' no-print'}`}
                aria-label="Data de status"
                value={s.project.statusDate ?? ''}
                disabled={readOnly}
                onChange={(e) => void command(setStatusDate(e.target.value || null))}
              />
              {!s.project.statusDate && <span className="muted tb-mono">hoje · {formatDateBR(clock.today())}</span>}
            </span>
          </label>
          <div className="tb-cell toolbar no-print" role="toolbar" aria-label="Ações do projeto">
            <DataMenu />
            <button className="btn btn-sm btn-ghost" title="Relatório executivo A4" onClick={() => setComposerOpen(true)}>
              <Printer size={14} aria-hidden="true" /> Imprimir A4
            </button>
            <NavLink to="/projeto/configuracao" className="btn btn-sm btn-ghost" title="Configurações">
              <Settings size={14} aria-hidden="true" /> Configurações
            </NavLink>
          </div>
        </div>
        <div className="domain-row no-print">
          <nav className="domain-bar" aria-label="Domínios" ref={domainBar}>
            {/* "Geral" (centro de comando) fica antes da divisória; à direita, os 7 domínios de desempenho. */}
            <Link to="/projeto/geral" className={`domain-tab${current === 'geral' ? ' active' : ''}`} aria-current={current === 'geral' ? 'page' : undefined}>
              <TargetIcon />
              Geral
            </Link>
            <span className="domain-divider" role="separator" aria-orientation="vertical" />
            {tabs.map((t) => {
              const Icon = t.icon;
              return (
                <Link key={t.id} to={t.to} className={`domain-tab${t.active ? ' active' : ''}`} aria-current={t.active ? 'page' : undefined}>
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                  {t.label}
                </Link>
              );
            })}
          </nav>
          {/* Aviso permanente (SPEC §5): visível em qualquer largura. */}
          <p className="storage-notice">
            <HardDrive size={13} aria-hidden="true" />
            Seus dados ficam apenas neste navegador. Exporte regularmente.
          </p>
        </div>
      </header>
      {readOnly && (
        <div className="readonly-banner">
          Projeto encerrado — somente leitura.
          <button className="btn btn-sm" onClick={() => void command(reopenProject())}>
            Reabrir projeto
          </button>
        </div>
      )}

      <main className="main">
        {sections.length > 1 && (
          <nav className="section-tabs no-print" aria-label="Seções">
            {sections.map((sec) => (
              <NavLink key={sec.path} to={`/projeto/${current}/${sec.path}`} aria-current={sec.path === currentSection ? 'page' : undefined}>
                {sec.label}
              </NavLink>
            ))}
          </nav>
        )}
        <Outlet />
      </main>
      <ReportComposer
        open={composerOpen}
        enabled={analysis.config.enabled}
        onClose={() => setComposerOpen(false)}
        onGenerate={(request, print) => {
          setComposerOpen(false);
          setIssued({ seq: (issued?.seq ?? 0) + 1, request, print });
        }}
      />
      {issued && (
        <PrintableReport
          key={issued.seq}
          analysis={analysis}
          request={issued.request}
          issuedOn={clock.today()}
          printOnOpen={issued.print}
          onClose={() => setIssued(null)}
        />
      )}
    </div>
  );
}
