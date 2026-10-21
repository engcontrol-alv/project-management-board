import { Navigate, useParams, type RouteObject } from 'react-router-dom';
import { PartiesPage } from '@/modules/stakeholders/ui/PartiesPage';
import { useAnalysis } from '@/platform/react/hooks';
import { isImplemented, MANIFESTS } from '@/project/registry';
import { VIEWS } from './registry';
import { ConfigPage } from './ui/ConfigPage';
import { GeralPage } from './ui/GeralPage';
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

/** Com Partes Interessadas ligado, o cadastro vive nas seções do módulo. */
function PeopleRoute() {
  const analysis = useAnalysis();
  if (analysis?.config.enabled.stakeholders) return <Navigate to="/projeto/stakeholders/cadastro" replace />;
  return <PartiesPage />;
}

export function buildRoutes(): RouteObject[] {
  return [
    { path: '/', element: <Navigate to="/projeto/geral" replace /> },
    {
      path: '/projeto',
      element: <ProjectLayout />,
      children: [
        { index: true, element: <Navigate to="/projeto/geral" replace /> },
        { path: 'geral', element: <GeralPage /> },
        { path: 'configuracao', element: <ConfigPage /> },
        { path: 'pessoas', element: <PeopleRoute /> },
        { path: ':modulo', element: <ModuleSection /> },
        { path: ':modulo/:secao', element: <ModuleSection /> },
      ],
    },
    { path: '*', element: <Navigate to="/" replace /> },
  ];
}
