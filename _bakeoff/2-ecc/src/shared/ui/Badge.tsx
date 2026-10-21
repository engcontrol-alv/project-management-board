import type { Tone } from './tones';

export function Badge({ text, tone, title, dot = false }: { text: string; tone: Tone; title?: string; dot?: boolean }) {
  return (
    <span className="tb-badge" title={title} style={{ color: `var(--${tone})`, background: `var(--${tone}-soft)` }}>
      {dot && <span className="tb-badge-dot" aria-hidden="true" />}
      {text}
    </span>
  );
}
