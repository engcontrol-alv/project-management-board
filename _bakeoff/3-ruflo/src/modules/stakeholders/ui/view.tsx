import type { ModuleView } from '@/registers/module-view';
import { CommunicationsPage } from './CommunicationsPage';
import { PartiesPage } from './PartiesPage';
import { PowerInterestPage } from './PowerInterestPage';
import { SuppliersPage } from './SuppliersPage';

/** Com o módulo desligado, o cadastro básico continua em /projeto/pessoas. */
export const stakeholdersView: ModuleView = {
  id: 'stakeholders',
  sections: [
    { path: 'cadastro', label: 'Cadastro', element: <PartiesPage /> },
    { path: 'matriz', label: 'Poder × Interesse', element: <PowerInterestPage /> },
    { path: 'comunicacao', label: 'Comunicação', element: <CommunicationsPage /> },
    { path: 'fornecedores', label: 'Fornecedores', element: <SuppliersPage /> },
  ],
};
