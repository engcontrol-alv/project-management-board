import type { ModuleView } from '@/registers/module-view';
import { RequirementsPage } from './RequirementsPage';
import { WbsPage } from './WbsPage';
import { DeliverablesPage } from './DeliverablesPage';
import { ChangeRequestsPage } from './ChangeRequestsPage';

export const scopeView: ModuleView = {
  id: 'scope',
  sections: [
    { path: 'requisitos', label: 'Requisitos', Component: RequirementsPage },
    { path: 'eap', label: 'EAP', Component: WbsPage },
    { path: 'entregaveis', label: 'Entregáveis', Component: DeliverablesPage },
    { path: 'mudancas', label: 'Mudanças', Component: ChangeRequestsPage },
  ],
};
