import type { ModuleView } from '@/registers/module-view';
import { MilestonesPage } from './MilestonesPage';
import { GanttPage } from './GanttPage';
import { SCurvePage } from './SCurvePage';
import { CriticalPathPage } from './CriticalPathPage';

export const scheduleView: ModuleView = {
  id: 'schedule',
  sections: [
    { path: 'marcos', label: 'Marcos', Component: MilestonesPage },
    { path: 'gantt', label: 'Gantt', Component: GanttPage },
    { path: 'curva-s', label: 'Curva S', Component: SCurvePage },
    { path: 'caminho-critico', label: 'Caminho crítico', Component: CriticalPathPage },
  ],
};
