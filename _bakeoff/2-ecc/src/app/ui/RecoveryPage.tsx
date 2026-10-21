import { useState } from 'react';
import { downloadText } from '@/shared/lib/download';
import { Card } from '@/shared/ui/Card';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';

export function RecoveryPage({
  raw,
  errors,
  today,
  onClear,
}: {
  raw: unknown;
  errors: string[];
  today: string;
  onClear: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <main className="tb-main" style={{ maxWidth: 760 }}>
      <Card title="Os dados locais não puderam ser abertos">
        <p>Foram encontrados problemas nos dados salvos neste navegador:</p>
        <ul className="tb-error">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
        <div className="tb-row">
          <button type="button" onClick={() => downloadText(`pmb-dados-brutos-${today}.json`, JSON.stringify(raw, null, 2))}>
            Exportar dados brutos
          </button>
          <button type="button" className="danger" onClick={() => setConfirming(true)}>
            Apagar dados locais
          </button>
        </div>
      </Card>
      <ConfirmTypedDialog
        open={confirming}
        title="Apagar dados locais"
        word="APAGAR"
        onCancel={() => setConfirming(false)}
        onConfirm={async () => {
          setConfirming(false);
          await onClear();
        }}
      >
        <p>Todos os dados deste navegador serão apagados. Exporte os dados brutos antes, se precisar deles.</p>
      </ConfirmTypedDialog>
    </main>
  );
}
