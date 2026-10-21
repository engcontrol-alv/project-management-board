export function KpiTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="tb-kpi" data-testid="kpi">
      <div className="tb-kpi-label">{label}</div>
      <div className="tb-kpi-value">{value}</div>
      {hint && <div className="tb-kpi-hint">{hint}</div>}
    </div>
  );
}
