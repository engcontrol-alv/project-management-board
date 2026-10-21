import { Badge } from '@/shared/ui/Badge';
import type { Tone } from '@/shared/ui/tones';
import type { Band } from '../domain/exposure';

/** Uma cor por faixa (a paleta aponta --gold para --amber, então Moderado usa o navy). */
export const BAND_TONE: Record<Band, Tone> = { Baixo: 'green', Moderado: 'blue', Alto: 'amber', Crítico: 'red' };

/** Exposição sempre com texto ("9 · Crítico"); a cor só apoia. */
export function ExposureBadge({ value }: { value: { score: number; band: Band } | 'Não avaliado' }) {
  if (value === 'Não avaliado') return <Badge text="Não avaliado" tone="gray" />;
  return <Badge text={`${value.score} · ${value.band}`} tone={BAND_TONE[value.band]} />;
}
