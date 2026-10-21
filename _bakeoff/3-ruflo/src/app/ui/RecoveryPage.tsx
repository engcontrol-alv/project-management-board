import { useState } from 'react';
import { downloadText } from '@/shared/lib/download';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';

export function RecoveryPage({
  errors,
  raw,
  today,
  onClear,
}: {
  errors: string[];
  raw: unknown;
  today: string;
  onClear: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div className="start">
      <h1 className="brand">Project Management Board</h1>
      <div className="card">
        <h2>Os dados locais não puderam ser abertos</h2>
        <p className="muted">Exporte os dados brutos para análise antes de apagar.</p>
        <div className="errors">
          <ul>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
        <div className="row">
          <button className="btn" onClick={() => downloadText(`pmb-dados-brutos-${today}.json`, JSON.stringify(raw, null, 2))}>
            Exportar dados brutos
          </button>
          <button className="btn btn-danger" onClick={() => setConfirm(true)}>
            Apagar dados locais
          </button>
        </div>
      </div>
      <ConfirmTypedDialog
        open={confirm}
        title="Apagar dados locais"
        word="APAGAR"
        onCancel={() => setConfirm(false)}
        onConfirm={() => {
          setConfirm(false);
          onClear();
        }}
      >
        <p>Todos os dados deste navegador serão apagados.</p>
      </ConfirmTypedDialog>
    </div>
  );
}
