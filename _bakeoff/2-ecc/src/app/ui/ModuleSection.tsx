import { NavLink, Navigate, useParams } from 'react-router-dom';
import { isImplementedModule } from '@/project/registry';
import { resolveConfig } from '@/project/config';
import { useSnapshot } from '@/platform/react/hooks';
import { VIEWS } from '../registry';

export function ModuleSection() {
  const { modulo = '', secao } = useParams();
  const snapshot = useSnapshot();
  if (!snapshot) return null;
  if (!isImplementedModule(modulo)) return <Navigate to="/" replace />;
  if (!resolveConfig(snapshot.project.config).enabled[modulo]) {
    return <p className="tb-empty">Módulo desligado. Ligue-o em Configuração para ver seus dados.</p>;
  }
  const { sections } = VIEWS[modulo];
  const first = sections[0];
  if (!first) return <p className="tb-empty">Módulo sem telas nesta etapa.</p>;
  if (!secao) return <Navigate to={first.path} replace />;
  const section = sections.find((s) => s.path === secao);
  if (!section) return <Navigate to={`/projeto/${modulo}/${first.path}`} replace />;
  return (
    <>
      <nav className="tb-tabs no-print" aria-label="Seções">
        {sections.map((s) => (
          <NavLink
            key={s.path}
            to={`/projeto/${modulo}/${s.path}`}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            {s.label}
          </NavLink>
        ))}
      </nav>
      <section.Component />
    </>
  );
}
