import { Navigate, useRoutes, type RouteObject } from 'react-router-dom';
import { ProjectLayout } from './ui/ProjectLayout';
import { ModuleSection } from './ui/ModuleSection';
import { PartiesPage } from '@/modules/stakeholders/ui/PartiesPage';
import { ConfigPage } from './ui/ConfigPage';

export const HOME = '/projeto/governance/painel';

export const ROUTES: RouteObject[] = [
  { path: '/', element: <Navigate to={HOME} replace /> },
  {
    path: '/projeto',
    element: <ProjectLayout />,
    children: [
      { index: true, element: <Navigate to={HOME} replace /> },
      { path: 'pessoas', element: <PartiesPage /> },
      { path: 'configuracao', element: <ConfigPage /> },
      { path: ':modulo', element: <ModuleSection /> },
      { path: ':modulo/:secao', element: <ModuleSection /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
];

/** Rotas por hash (funciona em qualquer hospedagem estática). */
export function AppRoutes() {
  return useRoutes(ROUTES);
}
