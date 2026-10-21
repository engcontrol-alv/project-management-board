import type { ReactNode } from 'react';

export type Column<R> = { key: string; label: string; render?: (row: R) => ReactNode; mono?: boolean };

export function DataTable<R extends { id: string }>({
  columns,
  rows,
  actions,
  empty = 'Nenhum registro.',
  rowClassName,
}: {
  columns: Column<R>[];
  rows: R[];
  actions?: (row: R) => ReactNode;
  empty?: string;
  rowClassName?: (row: R) => string | undefined;
}) {
  if (!rows.length) return <p className="tb-empty">{empty}</p>;
  return (
    <div className="tb-table-wrap">
      <table className="tb-table">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {actions && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={rowClassName?.(row)}>
              {columns.map((c) => (
                <td key={c.key} className={c.mono ? 'tb-mono' : undefined}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                </td>
              ))}
              {actions && (
                <td className="tb-actions">
                  <div className="tb-row">{actions(row)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
