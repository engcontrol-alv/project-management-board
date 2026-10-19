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
      <div className="kpi-value tb-mono">{value}</div>
      {hint && <div className="kpi-hint">{hint}</div>}
      {children}
    </div>
  );
}
