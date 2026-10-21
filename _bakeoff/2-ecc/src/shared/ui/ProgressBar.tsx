import { formatPercent } from '@/shared/lib/format';

/** Barra de % físico com o número ao lado (a cor nunca é o único portador da informação). */
export function ProgressBar({ value }: { value: number | null }) {
  if (value === null) return <span className="tb-mono tb-hint">n/a</span>;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <span className="tb-progress">
      <span className="tb-progress-track" aria-hidden="true">
        <span className={`tb-progress-fill${pct >= 100 ? ' done' : ''}`} style={{ width: `${pct}%`, display: 'block' }} />
      </span>
      <span className="tb-num">{formatPercent(value)}</span>
    </span>
  );
}
