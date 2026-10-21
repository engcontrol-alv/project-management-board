import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Dialog({
  open,
  title,
  onClose,
  children,
  actions,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  if (!open) return null;
  // Portal no body: um ancestral com backdrop-filter/transform (ex.: o cabeçalho) prenderia o overlay fixo.
  return createPortal(
    <div
      className="dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="dialog-header">
          <h2>{title}</h2>
        </div>
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div className="errors" role="alert">
      {errors.length === 1 ? (
        errors[0]
      ) : (
        <ul>
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
