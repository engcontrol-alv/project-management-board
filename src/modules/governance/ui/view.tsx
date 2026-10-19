import type { ModuleView } from '@/registers/module-view';
import { useRepositoryContext } from '@/platform/react/hooks';
import { CharterPage } from './CharterPage';
import { Dashboard } from './Dashboard';
import { DocsProcurementPage } from './DocsProcurementPage';
import { LessonsPage, MeetingsPage, NormsPage } from './RecordsPages';

function Meetings() {
  const { clock } = useRepositoryContext();
  return <MeetingsPage today={clock.today()} />;
}

export const governanceView: ModuleView = {
  id: 'governance',
  sections: [
    { path: 'painel', label: 'Painel', element: <Dashboard /> },
    { path: 'abertura-encerramento', label: 'Abertura e encerramento', element: <CharterPage /> },
    { path: 'normas', label: 'Normas', element: <NormsPage /> },
    { path: 'documentacao-aquisicoes', label: 'Documentação e aquisições', element: <DocsProcurementPage /> },
    { path: 'reunioes', label: 'Reuniões', element: <Meetings /> },
    { path: 'licoes', label: 'Lições aprendidas', element: <LessonsPage /> },
  ],
};
