import { Link } from 'react-router-dom';
import { formatDateBR, maxDate, minDate } from '@/shared/lib/dates';
import { formatPercent } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/Badge';
import { useAnalysis } from '@/platform/react/hooks';

/**
 * Fases do ciclo de vida: a lista configurada (Configurações → Cronograma), a fase atual da ficha
 * e, por fase, os pacotes e marcos com datas previstas e avanço. Somente leitura.
 */
export function PhasesPage() {
  const analysis = useAnalysis();
  if (!analysis) return null;
  const { snapshot, derived, config } = analysis;
  const phases = config.settings.schedule.phases;
  const current = phases.indexOf(snapshot.governance.profile.charter.currentPhase);
  const packages = Object.values(snapshot.scope.wbs).filter((n) => n.kind === 'Pacote de trabalho');
  const milestones = Object.values(snapshot.schedule.milestones);
  const scheduled = derived.schedule.ok ? derived.schedule.tasks : {};

  const rows = phases.map((phase, i) => {
    const pkgs = packages.filter((p) => p.phase === phase);
    const tasks = pkgs.map((p) => scheduled[p.id]).filter((t) => t !== undefined);
    const weight = pkgs.reduce((s, p) => s + p.duration, 0);
    const progress = weight > 0 ? pkgs.reduce((s, p) => s + p.duration * p.percentComplete, 0) / weight : null;
    const situation = current < 0 ? 'Prevista' : i < current ? 'Concluída' : i === current ? 'Atual' : 'Prevista';
    return {
      phase,
      situation,
      packages: pkgs.length,
      milestones: milestones.filter((m) => m.phase === phase).length,
      start: tasks.length ? minDate(...tasks.map((t) => t.start)) : null,
      finish: tasks.length ? maxDate(...tasks.map((t) => t.finish)) : null,
      progress,
    };
  });

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>Fases do ciclo de vida</h1>
        <Link to="/projeto/configuracao" className="btn btn-sm btn-ghost">
          Editar a lista de fases em Configurações
        </Link>
      </div>
      <p className="muted small">
        Fase atual definida na ficha do projeto: <strong>{snapshot.governance.profile.charter.currentPhase || 'não definida'}</strong>.
        Datas e avanço vêm dos pacotes da EAP de cada fase.
      </p>
      <div className="card tb-card flush">
        <div className="table-wrap">
          <table className="tbl" aria-label="Fases do ciclo de vida">
            <thead>
              <tr>
                <th>#</th>
                <th>Fase</th>
                <th>Situação</th>
                <th>Pacotes</th>
                <th>Marcos</th>
                <th>Início previsto</th>
                <th>Término previsto</th>
                <th>Avanço</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.phase} className={r.situation === 'Atual' ? 'row-current' : undefined}>
                  <td className="tb-mono">{i + 1}</td>
                  <td>{r.phase}</td>
                  <td>
                    <StatusBadge status={r.situation} />
                  </td>
                  <td>
                    <span className="tb-mono phase-packages">{r.packages}</span>
                  </td>
                  <td>
                    <span className="tb-mono phase-milestones">{r.milestones}</span>
                  </td>
                  <td className="tb-mono">{formatDateBR(r.start)}</td>
                  <td className="tb-mono">{formatDateBR(r.finish)}</td>
                  <td className="tb-mono">{r.progress === null ? '—' : formatPercent(r.progress)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
