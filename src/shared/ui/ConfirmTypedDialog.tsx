import { useState, type ReactNode } from 'react';
import { Dialog } from './Dialog';

/** Confirmação que exige digitar uma palavra exata (ex.: APAGAR). */
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
  const close = () => {
    setTyped('');
    onCancel();
  };
  return (
    <Dialog
      open={open}
      title={title}
      onClose={close}
      actions={
        <>
          <button className="btn" onClick={close}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            disabled={typed !== word}
            onClick={() => {
              setTyped('');
              onConfirm();
            }}
          >
            Confirmar
          </button>
        </>
      }
    >
      {children}
      <div className="field">
        <label htmlFor="confirm-typed">Digite {word} para confirmar</label>
        <input
          id="confirm-typed"
          type="text"
          value={typed}
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
        />
      </div>
    </Dialog>
  );
}
