import { RAG_LABEL, statusTone, type RagValue, type Tone } from './tones';

export function Badge({ text, tone, title, dot }: { text: string; tone: Tone; title?: string; dot?: boolean }) {
  return (
    <span
      className="tb-badge"
      title={title}
      style={{ color: `var(--${tone})`, background: `var(--${tone}-soft)` }}
    >
      {dot && <span className="dot" aria-hidden="true" />}
      {text}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge text={status || '—'} tone={statusTone(status)} />;
}

const RAG_COLOR: Record<RagValue, string> = {
  verde: 'var(--green)',
  amarelo: 'var(--amber)',
  vermelho: 'var(--red)',
  'n/a': 'var(--gray)',
};

/** Situação só pela bolinha colorida; o nome fica no aria-label e no title (motivo ao passar o mouse). */
export function RagDot({ rag, reason }: { rag: RagValue; reason?: string }) {
  const label = `Situação: ${RAG_LABEL[rag]}`;
  return (
    <span
      className="rag-dot"
      role="img"
      aria-label={label}
      title={reason ? `${label} — ${reason}` : label}
      style={{ background: RAG_COLOR[rag] }}
    />
  );
}
