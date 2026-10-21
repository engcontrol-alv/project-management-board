import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card } from '@/shared/ui/Card';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';
import { useSnapshot } from '@/platform/react/hooks';
import { useRepository } from '@/platform/react/RepositoryProvider';

/** Dados locais: exportar/importar ficam no cabeçalho; aqui só a ação destrutiva de apagar. */
export function DataMenu() {
  const snapshot = useSnapshot();
  const { repository, onCleared } = useRepository();
  const [erasing, setErasing] = useState(false);

  if (!snapshot) return null;

  return (
    <Card title="Dados">
      <p className="tb-hint">Exportar e importar ficam no cabeçalho. Apagar remove o projeto deste navegador.</p>
      <button type="button" className="danger" onClick={() => setErasing(true)}>
        <Trash2 size={14} /> Apagar dados locais
      </button>

      <ConfirmTypedDialog
        open={erasing}
        title="Apagar dados locais"
        word="APAGAR"
        onCancel={() => setErasing(false)}
        onConfirm={async () => {
          setErasing(false);
          await repository.clearAll();
          onCleared?.();
        }}
      >
        <p>Todos os dados deste navegador serão apagados. Esta ação não pode ser desfeita.</p>
      </ConfirmTypedDialog>
    </Card>
  );
}
