import { useState } from 'react';
import { Download, FilePlus2, Sparkles, Trash2, Upload } from 'lucide-react';
import { newId } from '@/shared/lib/ids';
import { Badge } from '@/shared/ui/Badge';
import { Card } from '@/shared/ui/Card';
import { downloadText } from '@/shared/lib/download';
import { ConfirmTypedDialog } from '@/shared/ui/ConfirmTypedDialog';
import { Dialog } from '@/shared/ui/Dialog';
import { readFileText } from '@/platform/transfer/file';
import { useRepositoryContext, useSnapshot } from '@/platform/react/hooks';
import {
  exportFileName,
  parseImportFile,
  summarize,
  toExport,
  withChecksum,
  type ImportSummary,
  type Integrity,
} from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { buildDemoSnapshot } from '../demo/demo-project';
import { useAppActions } from '../shell';

const INTEGRITY_BADGE: Record<Integrity, { text: string; tone: 'green' | 'gray' | 'gold' }> = {
  verificada: { text: 'Integridade verificada (SHA-256)', tone: 'green' },
  ausente: { text: 'Arquivo sem checksum (exportação antiga)', tone: 'gray' },
  'não verificável': { text: 'Checksum não verificado (navegador sem Web Crypto)', tone: 'gold' },
};

export function DataMenu() {
  const snapshot = useSnapshot();
  const { clock } = useRepositoryContext();
  const actions = useAppActions();
  const [preview, setPreview] = useState<{ snapshot: ProjectSnapshot; summary: ImportSummary; integrity?: Integrity } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmNew, setConfirmNew] = useState(false);

  // Backup com checksum SHA-256 do conteúdo (D9).
  const exportNow = async () => {
    if (!snapshot) return;
    const file = await withChecksum(toExport(snapshot, clock.now()));
    downloadText(exportFileName(snapshot, clock.today()), JSON.stringify(file, null, 2));
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const r = await parseImportFile(await readFileText(file));
    if (r.ok) setPreview(r.value);
    else setImportError(r.error.message);
  };

  // Substituir pelo projeto de demonstração passa pela mesma prévia e confirmação da importação.
  const previewDemo = () => {
    const demo = buildDemoSnapshot({ now: clock.now(), today: clock.today(), newId });
    setPreview({ snapshot: demo, summary: summarize(demo) });
  };

  // Sair do projeto atual (ex.: o demo) e voltar à tela inicial — confirmação simples, sem digitar palavra.
  const startNew = () => {
    setConfirmNew(false);
    window.location.hash = '#/';
    void actions.clearAll();
  };

  return (
    <>
      <button className="btn btn-sm btn-ghost" title="Novo Projeto" onClick={() => setConfirmNew(true)}>
        <FilePlus2 size={14} aria-hidden="true" /> Novo Projeto
      </button>
      <label className="btn btn-sm btn-ghost" htmlFor="data-import" title="Importar">
        <Upload size={14} aria-hidden="true" /> Importar
      </label>
      <button className="btn btn-sm btn-ghost" title="Exportar" onClick={() => void exportNow()} disabled={!snapshot}>
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
        open={confirmNew}
        title="Começar um novo projeto?"
        onClose={() => setConfirmNew(false)}
        actions={
          <>
            <button className="btn" onClick={() => void exportNow()} disabled={!snapshot}>
              Exportar o atual
            </button>
            <button className="btn" onClick={() => setConfirmNew(false)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={startNew}>
              Apagar e começar novo
            </button>
          </>
        }
      >
        <div className="notice">Exporte o projeto atual antes se quiser guardá-lo.</div>
        <p style={{ marginBottom: 0 }}>
          {snapshot ? (
            <>
              <strong>{snapshot.project.info.name}</strong> <span className="tb-mono">{snapshot.project.info.code}</span> será
              apagado deste navegador e você voltará à tela inicial para criar ou importar um projeto.
            </>
          ) : (
            'O projeto atual será apagado deste navegador.'
          )}
        </p>
      </Dialog>

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
            <button className="btn" onClick={() => void exportNow()}>
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
            {preview.integrity && (
              <p className="small">
                <Badge {...INTEGRITY_BADGE[preview.integrity]} dot />
              </p>
            )}
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
