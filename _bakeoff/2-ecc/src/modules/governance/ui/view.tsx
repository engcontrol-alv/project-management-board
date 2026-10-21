import type { ModuleView } from '@/registers/module-view';
import { Dashboard } from './Dashboard';
import { CharterPage } from './CharterPage';
import { NormsPage } from './NormsPage';
import { DocsProcurementPage } from './DocsProcurementPage';
import { MeetingsPage } from './MeetingsPage';
import { LessonsPage } from './LessonsPage';

export const governanceView: ModuleView = {
  id: 'governance',
  sections: [
    { path: 'painel', label: 'Painel', Component: Dashboard },
    { path: 'abertura-encerramento', label: 'Abertura e encerramento', Component: CharterPage },
    { path: 'normas', label: 'Normas', Component: NormsPage },
    { path: 'documentacao-aquisicoes', label: 'Documentação e aquisições', Component: DocsProcurementPage },
    { path: 'reunioes', label: 'Reuniões', Component: MeetingsPage },
    { path: 'licoes', label: 'Lições aprendidas', Component: LessonsPage },
  ],
};
