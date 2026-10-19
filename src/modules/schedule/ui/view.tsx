import { lazy, Suspense } from 'react';
import type { ModuleView } from '@/registers/module-view';
import { CriticalPathPage } from './CriticalPathPage';
import { GanttPage } from './GanttPage';
import { MilestonesPage } from './MilestonesPage';

// Recharts só é baixado ao abrir a Curva S: o bundle principal fica sem a biblioteca de gráficos.
const SCurvePage = lazy(() => import('./SCurvePage').then((m) => ({ default: m.SCurvePage })));

export const scheduleView: ModuleView = {
  id: 'schedule',
  sections: [
    { path: 'marcos', label: 'Marcos', element: <MilestonesPage /> },
    { path: 'gantt', label: 'Gantt', element: <GanttPage /> },
    {
      path: 'curva-s',
      label: 'Curva S',
      element: (
        <Suspense fallback={<p className="muted">Carregando gráfico…</p>}>
          <SCurvePage />
        </Suspense>
      ),
    },
    { path: 'caminho-critico', label: 'Caminho crítico', element: <CriticalPathPage /> },
  ],
};
