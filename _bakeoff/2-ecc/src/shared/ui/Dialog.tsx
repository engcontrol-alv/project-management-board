import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function Dialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="tb-dialog-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="tb-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <div className="tb-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="icon" aria-label="Fechar" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
