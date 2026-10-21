import { NavLink, Outlet } from 'react-router-dom';
import { CalendarRange, Landmark, LayoutGrid, ListTree, Users, type LucideIcon } from 'lucide-react';
import { formatDateBR } from '@/shared/lib/dates';
import { Badge } from '@/shared/ui/Badge';
import { ragLabel, ragTone } from '@/shared/ui/tones';
import { computeDashboard } from '@/analytics/dashboard';
import { IMPLEMENTED_MODULES, MANIFESTS, type ImplementedModuleId } from '@/project/registry';
import { setStatusDate } from '@/commands/project';
import { useAnalysis, useCommand } from '@/platform/react/hooks';
import { useRepository } from '@/platform/react/RepositoryProvider';
import { VIEWS } from '../registry';
import { ProjectActions } from './ProjectActions';

const ICONS: Record<ImplementedModuleId, LucideIcon> = {
  governance: Landmark,
  scope: ListTree,
  schedule: CalendarRange,
  stakeholders: Users,
};

/** Domínios na barra horizontal: módulos com telas, mais o cadastro de partes interessadas. */
function domains(enabled: Record<ImplementedModuleId, boolean>): { id: ImplementedModuleId; to: string }[] {
  return IMPLEMENTED_MODULES.filter((id) => enabled[id]).flatMap((id) => {
    if (VIEWS[id].sections.length > 0) return [{ id, to: `/projeto/${id}` }];
    return id === 'stakeholders' ? [{ id, to: '/projeto/pessoas' }] : [];
  });
}

/** Casca do projeto: carimbo técnico (identificação + ações globais) e barra horizontal de domínios. */
export function ProjectLayout() {
  const analysis = useAnalysis();
  const run = useCommand();
  const { clock } = useRepository();
  if (!analysis) return <p className="tb-main tb-hint">Carregando…</p>;
  const { project } = analysis.snapshot;
  const overall = computeDashboard(analysis).overall;

  return (
    <>
      <header className="tb-appbar">
        <div className="tb-titleblock">
          <div className="tb-tb-cell tb-tb-brand" aria-hidden="true">
            <span className="tb-brand-mark" title="Project Management Board">
              <LayoutGrid size={15} />
            </span>
          </div>
          <div className="tb-tb-cell">
            <span className="tb-tb-label">Código</span>
            <span className="tb-mono tb-tb-value">{project.info.code}</span>
          </div>
          <div className="tb-tb-cell tb-tb-name">
            <span className="tb-tb-label">Projeto</span>
            <h1 className="tb-identity-name" title={project.info.name}>
              {project.info.name}
            </h1>
          </div>
          <div className="tb-tb-cell">
            <span className="tb-tb-label">Status</span>
            <Badge text={ragLabel(overall)} tone={ragTone(overall)} dot title="Status geral do projeto" />
          </div>
          <div className="tb-tb-cell tb-statusdate">
            <label className="tb-tb-label" htmlFor="tb-status-date">
              Data de status
            </label>
            <span className="tb-row" style={{ flexWrap: 'nowrap', gap: 6 }}>
              <input
                id="tb-status-date"
                type="date"
                className="no-print"
                value={project.statusDate ?? ''}
                onChange={(e) => run(setStatusDate(e.target.value || null))}
              />
              <span className="tb-mono tb-tb-value print-only">
                {formatDateBR(project.statusDate ?? clock.today())}
              </span>
              {!project.statusDate && (
                <span className="tb-hint no-print" style={{ margin: 0 }}>
                  hoje ({formatDateBR(clock.today())})
                </span>
              )}
            </span>
          </div>
          <div className="tb-tb-cell tb-tb-actions no-print">
            <ProjectActions />
          </div>
        </div>
        <nav className="tb-domains no-print" aria-label="Módulos">
          {domains(analysis.config.enabled).map(({ id, to }) => {
            const Icon = ICONS[id];
            return (
              <NavLink key={id} to={to} className={({ isActive }) => `tb-domain${isActive ? ' active' : ''}`}>
                <Icon size={16} aria-hidden="true" />
                {MANIFESTS[id].label}
              </NavLink>
            );
          })}
        </nav>
      </header>
      <main className="tb-main">
        <Outlet />
        <footer className="tb-footer no-print">
          Seus dados ficam apenas neste navegador. Exporte regularmente.
        </footer>
      </main>
    </>
  );
}
