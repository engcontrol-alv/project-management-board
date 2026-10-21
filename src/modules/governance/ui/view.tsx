import type { ModuleView } from '@/registers/module-view';
import { useRepositoryContext } from '@/platform/react/hooks';
import { ChangeRequestsPage } from './ChangeRequestsPage';
import { CharterPage } from './CharterPage';
import { ContractPage } from './ContractPage';
import { DocsProcurementPage } from './DocsProcurementPage';
import { PhasesPage } from './PhasesPage';
import { LessonsPage, MeetingsPage, NormsPage } from './RecordsPages';

function Meetings() {
  const { clock } = useRepositoryContext();
  return <MeetingsPage today={clock.today()} />;
}

/** O painel executivo consolidado mora na aba "Geral" (app/ui/GeralPage); aqui ficam as seções da Governança. */
export const governanceView: ModuleView = {
  id: 'governance',
  sections: [
    { path: 'abertura-encerramento', label: 'Abertura e encerramento', element: <CharterPage /> },
    { path: 'fases', label: 'Fases do ciclo de vida', element: <PhasesPage /> },
    { path: 'normas', label: 'Normas', element: <NormsPage /> },
    { path: 'documentacao-aquisicoes', label: 'Documentação e aquisições', element: <DocsProcurementPage /> },
    { path: 'mudancas', label: 'Mudanças', element: <ChangeRequestsPage /> },
    { path: 'contrato', label: 'Contrato', element: <ContractPage /> },
    { path: 'reunioes', label: 'Reuniões', element: <Meetings /> },
    { path: 'licoes', label: 'Lições aprendidas', element: <LessonsPage /> },
  ],
};
