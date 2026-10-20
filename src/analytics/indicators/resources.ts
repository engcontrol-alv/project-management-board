import type { ModuleIndicators } from '@/core/indicators';
import { resourcesRag } from '@/modules/resources';
import type { AnalysisContext } from '../alerts/types';

export function resourcesIndicators({ derived, config }: AnalysisContext): ModuleIndicators {
  const r = derived.resources;
  if (!r) return { rag: 'n/a', ragReason: 'Recursos desligado', kpis: [], alerts: [] };
  const kpis: ModuleIndicators['kpis'] = [
    { id: 'resources.overallocated', label: 'Recursos sobrealocados', value: r.overallocated.length, format: 'count' },
    { id: 'resources.peak', label: 'Pico de carga', value: r.peakPct, format: 'percent' },
  ];
  const { rag, reason } = resourcesRag(r.load, config.settings.resources);
  return { rag, ragReason: reason, kpis, alerts: [] };
}
