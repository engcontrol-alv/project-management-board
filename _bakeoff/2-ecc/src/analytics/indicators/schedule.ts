import type { ModuleIndicators } from '@/core/indicators';
import { scheduleRag } from '@/modules/schedule';
import { moduleAlerts } from '../alerts';
import type { AnalysisContext } from '../context';

export function scheduleIndicators(ctx: AnalysisContext): ModuleIndicators {
  const { derived } = ctx;
  const settings = ctx.config.settings.schedule;
  const milestones = Object.values(derived.milestones);
  const late = milestones.filter((m) => m.status === 'Atrasado');
  const { rag, reason } = derived.schedule.ok
    ? scheduleRag({
        spi: derived.progress.spi,
        milestones,
        greenMin: settings.spiGreenMin,
        yellowMin: settings.spiYellowMin,
      })
    : { rag: 'vermelho' as const, reason: 'A EAP tem dependência circular' };
  return {
    rag,
    ragReason: reason,
    kpis: [
      { id: 'schedule.spi', label: 'SPI físico', value: derived.progress.spi, format: 'ratio' },
      { id: 'schedule.progress', label: '% físico', value: derived.progress.actual, format: 'percent' },
      { id: 'schedule.late', label: 'Marcos atrasados', value: late.length, format: 'count' },
      {
        id: 'schedule.criticalLate',
        label: 'Marcos críticos atrasados',
        value: late.filter((m) => m.critical).length,
        format: 'count',
      },
    ],
    alerts: moduleAlerts(ctx, 'schedule'),
  };
}
