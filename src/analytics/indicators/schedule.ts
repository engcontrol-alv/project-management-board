import type { ModuleIndicators } from '@/core/indicators';
import { scheduleRag } from '@/modules/schedule';
import type { AnalysisContext } from '../alerts/types';

export function scheduleIndicators({ derived, config }: AnalysisContext): ModuleIndicators {
  const ms = Object.values(derived.milestones);
  const late = ms.filter((m) => m.status === 'Atrasado');
  const kpis: ModuleIndicators['kpis'] = [
    { id: 'schedule.spi', label: 'SPI físico', value: derived.progress.spi, format: 'ratio' },
    { id: 'schedule.progress', label: '% físico', value: derived.progress.actual, format: 'percent' },
    { id: 'schedule.lateMilestones', label: 'Marcos atrasados', value: late.length, format: 'count' },
    {
      id: 'schedule.lateCritical',
      label: 'Marcos críticos atrasados',
      value: late.filter((m) => m.critical).length,
      format: 'count',
    },
  ];
  if (!derived.schedule.ok)
    return { rag: 'vermelho', ragReason: 'A EAP tem dependência circular', kpis, alerts: [] };
  const { rag, reason } = scheduleRag({
    spi: derived.progress.spi,
    milestones: ms,
    greenMin: config.settings.schedule.spiGreenMin,
    yellowMin: config.settings.schedule.spiYellowMin,
  });
  return { rag, ragReason: reason, kpis, alerts: [] };
}
