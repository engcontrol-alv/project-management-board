import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';

export function ConfirmTypedDialog({
  open,
  title,
  word,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  word: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const [typed, setTyped] = useState('');
  const cancel = () => {
    setTyped('');
    onCancel();
  };
  return (
    <Dialog open={open} title={title} onClose={cancel}>
      {children}
      <label className="tb-field">
        <span>Digite {word} para confirmar</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      </label>
      <div className="tb-dialog-foot">
        <button type="button" onClick={cancel}>
          Cancelar
        </button>
        <button type="button" className="danger" disabled={typed !== word} onClick={onConfirm}>
          Confirmar
        </button>
      </div>
    </Dialog>
  );
}
