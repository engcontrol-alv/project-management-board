import type { ModuleView } from '@/registers/module-view';
import { RiskMatrixPage } from './RiskMatrixPage';
import { RisksPage } from './RisksPage';

export const risksView: ModuleView = {
  id: 'risks',
  sections: [
    { path: 'registro', label: 'Registro', element: <RisksPage /> },
    { path: 'matriz', label: 'Matriz P × I', element: <RiskMatrixPage /> },
  ],
};
