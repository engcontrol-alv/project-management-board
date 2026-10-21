import type { ModuleView } from '@/registers/module-view';
import { DeliverablesPage } from './DeliverablesPage';
import { RequirementsPage } from './RequirementsPage';
import { WbsPage } from './WbsPage';

export const scopeView: ModuleView = {
  id: 'scope',
  sections: [
    { path: 'requisitos', label: 'Requisitos', element: <RequirementsPage /> },
    { path: 'eap', label: 'EAP', element: <WbsPage /> },
    { path: 'entregaveis', label: 'Entregáveis', element: <DeliverablesPage /> },
  ],
};
