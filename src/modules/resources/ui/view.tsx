import type { ModuleView } from '@/registers/module-view';
import { AllocationsPage } from './AllocationsPage';
import { LoadPage } from './LoadPage';
import { ResourcesPage } from './ResourcesPage';

export const resourcesView: ModuleView = {
  id: 'resources',
  sections: [
    { path: 'recursos', label: 'Recursos', element: <ResourcesPage /> },
    { path: 'alocacoes', label: 'Alocações', element: <AllocationsPage /> },
    { path: 'carga', label: 'Carga', element: <LoadPage /> },
  ],
};
