import { useState } from 'react';
import { Download, Sparkles, Trash2, Upload } from 'lucide-react';
import { newId } from '@/shared/lib/ids';
import { Card } from '@/shared/ui/Card';
import { downloadText } from '@/shared/lib/download';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';
import { Dialog } from '@/shared/ui/Dialog';
import { readFileText } from '@/platform/transfer/file';
import { useRepositoryContext, useSnapshot } from '@/platform/react/hooks';
import { exportFileName, parseImportText, summarize, toExport, type ImportSummary } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { buildDemoSnapshot } from '../demo/demo-project';
import { useAppActions } from '../shell';

export function DataMenu() {
  const snapshot = useSnapshot();
  const { clock } = useRepositoryContext();
  const actions = useAppActions();
  const [preview, setPreview] = useState<{ snapshot: ProjectSnapshot; summary: ImportSummary } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const exportNow = () => {
    if (!snapshot) return;
    downloadText(exportFileName(snapshot, clock.today()), JSON.stringify(toExport(snapshot, clock.now()), null, 2));
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const r = parseImportText(await readFileText(file));
    if (r.ok) setPreview(r.value);
    else setImportError(r.error.message);
  };

  // Substituir pelo projeto de demonstração passa pela mesma prévia e confirmação da importação.
  const previewDemo = () => {
    const demo = buildDemoSnapshot({ now: clock.now(), today: clock.today(), newId });
    setPreview({ snapshot: demo, summary: summarize(demo) });
  };

  return (
    <>
      <label className="btn btn-sm btn-ghost" htmlFor="data-import" title="Importar">
        <Upload size={14} aria-hidden="true" /> Importar
      </label>
      <button className="btn btn-sm btn-ghost" title="Exportar" onClick={exportNow} disabled={!snapshot}>
        <Download size={14} aria-hidden="true" /> Exportar
      </button>
      <button className="btn btn-sm btn-ghost" title="Projeto demo" onClick={previewDemo}>
        <Sparkles size={14} aria-hidden="true" /> Projeto demo
      </button>
      <input
        id="data-import"
        type="file"
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={(e) => {
          void importFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      <Dialog
        open={importError !== null}
        title="Importação recusada"
        onClose={() => setImportError(null)}
        actions={
          <button className="btn" onClick={() => setImportError(null)}>
            Fechar
          </button>
        }
      >
        <div className="errors" role="alert">
          {importError}
        </div>
        <p className="muted small">Nenhum dado foi alterado.</p>
      </Dialog>

      <Dialog
        open={preview !== null}
        title="Substituir o projeto atual?"
        onClose={() => setPreview(null)}
        actions={
          <>
            <button className="btn" onClick={exportNow}>
              Exportar o atual
            </button>
            <button className="btn" onClick={() => setPreview(null)}>
              Cancelar
            </button>
            <button
              className="btn btn-primary"
              onClick={() => {
                const s = preview?.snapshot;
                setPreview(null);
                if (s) void actions.replaceProject(s);
              }}
            >
              Substituir
            </button>
          </>
        }
      >
        <div className="notice">Exporte o projeto atual antes de substituir.</div>
        {preview && (
          <>
            <p>
              <strong>{preview.summary.name}</strong> <span className="tb-mono">{preview.summary.code}</span>
            </p>
            <table className="tbl">
              <tbody>
                {Object.entries(preview.summary.counts).map(([label, count]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    <td className="tb-mono">{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </Dialog>

    </>
  );
}

/** Zona de perigo — em Configuração, longe das ações frequentes da barra superior. */
export function ClearDataCard() {
  const actions = useAppActions();
  const [confirmClear, setConfirmClear] = useState(false);
  return (
    <Card title="Dados locais">
      <p className="muted small">
        Exportar e importar ficam na barra superior. Apagar remove todo o banco deste navegador e não pode ser
        desfeito.
      </p>
      <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
        <Trash2 size={14} /> Apagar dados locais
      </button>
      <ConfirmTypedDialog
        open={confirmClear}
        title="Apagar dados locais"
        word="APAGAR"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false);
          void actions.clearAll();
        }}
      >
        <p>Todos os dados deste navegador serão apagados. Exporte antes se quiser guardar uma cópia.</p>
      </ConfirmTypedDialog>
    </Card>
  );
}
