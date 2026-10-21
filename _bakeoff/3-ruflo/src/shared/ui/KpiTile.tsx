import type { ReactNode } from 'react';

export function KpiTile({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value: string;
  hint?: string;
  children?: ReactNode;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      {/* Valores longos (moeda) ganham corpo menor para caber numa linha. */}
      <div className={`kpi-value tb-mono${value.length > 11 ? ' long' : ''}`}>{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
      {children}
    </div>
  );
}
