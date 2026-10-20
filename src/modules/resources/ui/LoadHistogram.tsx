import { formatDateBR } from '@/shared/lib/dates';
import type { WeekLoad } from '../domain/load';

const STEP = 40;
const BAR = 26;
const HEIGHT = 180;
const TOP = 18;

/** Geometria pura das barras (testável): altura proporcional a `maxPct`. */
export function histogramBars(weeks: WeekLoad[], opts: { height: number; maxPct: number }) {
  return weeks.map((w, i) => ({
    x: i * STEP,
    height: Math.round((w.demandPct / opts.maxPct) * opts.height),
    over: w.overPct !== null,
  }));
}

/** Histograma semanal em SVG próprio (D7): barras de demanda, linha da capacidade, sobrecarga hachurada e rotulada. */
export function LoadHistogram({ weeks }: { weeks: WeekLoad[] }) {
  const capacity = weeks[0]?.capacityPct ?? 100;
  const maxPct = Math.max(capacity * 1.5, ...weeks.map((w) => w.demandPct));
  const bars = histogramBars(weeks, { height: HEIGHT, maxPct });
  const width = Math.max(weeks.length * STEP, STEP);
  const capY = TOP + HEIGHT - (capacity / maxPct) * HEIGHT;
  return (
    <div className="table-wrap">
      <svg width={width + 8} height={TOP + HEIGHT + 24} role="img" aria-label="Histograma de carga" style={{ display: 'block' }}>
        <defs>
          <pattern id="load-over" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--red-soft)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--red)" strokeWidth="2" />
          </pattern>
        </defs>
        {bars.map((b, i) => {
          const w = weeks[i]!;
          const y = TOP + HEIGHT - b.height;
          return (
            <g key={w.week}>
              <title>{`Semana de ${formatDateBR(w.week)}: ${w.demandPct}% de ${w.capacityPct}%`}</title>
              <rect
                x={b.x + 4}
                y={y}
                width={BAR}
                height={b.height}
                fill={b.over ? 'url(#load-over)' : 'var(--navy)'}
                stroke={b.over ? 'var(--red)' : 'none'}
              />
              {b.over && (
                <text x={b.x + 4 + BAR / 2} y={y - 4} textAnchor="middle" fontSize={10.5} className="tb-mono" fill="var(--red)">
                  {`${Math.round(w.demandPct)}%`}
                </text>
              )}
              <text x={b.x + 4 + BAR / 2} y={TOP + HEIGHT + 14} textAnchor="middle" fontSize={10} className="tb-mono" fill="var(--ink-soft)">
                {formatDateBR(w.week).slice(0, 5)}
              </text>
            </g>
          );
        })}
        <line className="load-capacity" x1={0} x2={width + 8} y1={capY} y2={capY} stroke="var(--amber)" strokeWidth={1.5} strokeDasharray="4 3" />
      </svg>
    </div>
  );
}
