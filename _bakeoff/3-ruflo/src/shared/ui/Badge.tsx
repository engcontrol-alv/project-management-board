import { RAG_LABEL, ragTone, statusTone, type RagValue, type Tone } from './tones';

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

/** RAG sempre com texto, nunca só cor. */
export function RagBadge({ rag, reason }: { rag: RagValue; reason?: string }) {
  return <Badge text={`RAG ${RAG_LABEL[rag]}`} tone={ragTone(rag)} title={reason} dot />;
}
