import { Badge } from './Badge';

/** Registro ilustrativo: nunca salvo, contado ou exportado. */
export function ExampleCard({
  title,
  explanation,
  entries,
  onUse,
  disabled,
}: {
  title: string;
  explanation: string;
  entries: { label: string; value: string; hint?: string }[];
  onUse: () => void;
  disabled?: boolean;
}) {
  return (
    <article className="card example-card" aria-label={`Exemplo: ${title}`}>
      <div className="card-head">
        <Badge text="Exemplo" tone="gray" />
        <h3>{title}</h3>
        <button className="btn btn-sm" onClick={onUse} disabled={disabled}>
          Usar como modelo
        </button>
      </div>
      <p className="muted small">{explanation}</p>
      <dl>
        {entries.map((e) => (
          <div key={e.label} style={{ display: 'contents' }}>
            <dt title={e.hint}>{e.label}</dt>
            <dd>{e.value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
