import { Navigate, useParams, type RouteObject } from 'react-router-dom';
import { PartiesPage } from '@/modules/stakeholders/ui/PartiesPage';
import { useAnalysis } from '@/platform/react/hooks';
import { isImplemented, MANIFESTS } from '@/project/registry';
import { VIEWS } from './registry';
import { ConfigPage } from './ui/ConfigPage';
import { ProjectLayout } from './ui/ProjectLayout';

function ModuleSection() {
  const { modulo = '', secao } = useParams();
  const analysis = useAnalysis();
  if (!isImplemented(modulo)) return <Navigate to="/" replace />;
  const view = VIEWS[modulo];
  if (analysis && !analysis.config.enabled[modulo])
    return <p className="muted">{MANIFESTS[modulo].label} está desligado. Ligue o módulo em Configuração.</p>;
  const section = view.sections.find((s) => s.path === secao);
  if (!section) {
    const first = view.sections[0];
    return first ? <Navigate to={`/projeto/${modulo}/${first.path}`} replace /> : <Navigate to="/" replace />;
  }
  return <>{section.element}</>;
}

export function buildRoutes(): RouteObject[] {
  return [
    { path: '/', element: <Navigate to="/projeto/governance/painel" replace /> },
    {
      path: '/projeto',
      element: <ProjectLayout />,
      children: [
        { index: true, element: <Navigate to="/projeto/governance/painel" replace /> },
        { path: 'configuracao', element: <ConfigPage /> },
        { path: 'pessoas', element: <PartiesPage /> },
        { path: ':modulo', element: <ModuleSection /> },
        { path: ':modulo/:secao', element: <ModuleSection /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ];
}
