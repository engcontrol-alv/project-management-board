import { Badge } from './Badge';

export function ExampleCard({
  title,
  explanation,
  details,
  onUse,
}: {
  title: string;
  explanation: string;
  details?: { label: string; value: string }[];
  onUse?: () => void;
}) {
  return (
    <div className="tb-card tb-example" data-testid="example-card">
      <div className="tb-row" style={{ justifyContent: 'space-between' }}>
        <strong>{title}</strong>
        <Badge text="Exemplo" tone="gray" />
      </div>
      <p className="tb-hint" style={{ fontSize: 12 }}>
        {explanation}
      </p>
      {details && details.length > 0 && (
        <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px', fontSize: 12, margin: '8px 0' }}>
          {details.map((d) => (
            <div key={d.label} style={{ display: 'contents' }}>
              <dt style={{ color: 'var(--ink-soft)' }}>{d.label}</dt>
              <dd style={{ margin: 0 }}>{d.value}</dd>
            </div>
          ))}
        </dl>
      )}
      {onUse && (
        <button type="button" onClick={onUse}>
          Usar como modelo
        </button>
      )}
    </div>
  );
}
