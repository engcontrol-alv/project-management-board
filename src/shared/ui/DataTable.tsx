import type { ReactNode } from 'react';

export type Column<R> = {
  key: string;
  label: string;
  render?: (row: R) => ReactNode;
  mono?: boolean;
};

export function DataTable<R extends { id: string }>({
  columns,
  rows,
  actions,
  rowClassName,
  empty = 'Nenhum registro.',
  label,
}: {
  columns: Column<R>[];
  rows: R[];
  actions?: (row: R) => ReactNode;
  rowClassName?: (row: R) => string | undefined;
  empty?: string;
  /** Nome acessível da tabela. */
  label?: string;
}) {
  if (rows.length === 0) return <p className="muted">{empty}</p>;
  return (
    <div className="table-wrap">
      <table className="tbl" aria-label={label}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key}>{c.label}</th>
            ))}
            {actions && <th aria-label="Ações" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-row-id={r.id} className={rowClassName?.(r)}>
              {columns.map((c) => (
                <td key={c.key} className={c.mono ? 'tb-mono' : undefined}>
                  {c.render ? c.render(r) : String((r as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
              {actions && <td className="actions">{actions(r)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
