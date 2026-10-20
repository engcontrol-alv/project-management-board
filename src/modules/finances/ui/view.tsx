import type { ModuleView } from '@/registers/module-view';
import { BudgetLinesPage } from './BudgetLinesPage';
import { CashflowPage } from './CashflowPage';
import { EvmPage } from './EvmPage';
import { ProcurementsPage } from './ProcurementsPage';
import { SummaryPage } from './SummaryPage';

export const financesView: ModuleView = {
  id: 'finances',
  sections: [
    { path: 'resumo', label: 'Resumo', element: <SummaryPage /> },
    { path: 'orcamento', label: 'Orçamento', element: <BudgetLinesPage /> },
    { path: 'contratacoes', label: 'Contratações', element: <ProcurementsPage /> },
    { path: 'fluxo-de-caixa', label: 'Fluxo de caixa', element: <CashflowPage /> },
    { path: 'valor-agregado', label: 'Valor agregado', element: <EvmPage /> },
  ],
};
