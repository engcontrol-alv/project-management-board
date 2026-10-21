import { useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Download, Printer, Settings, Sparkles, Upload } from 'lucide-react';
import { newId } from '@/shared/lib/ids';
import { downloadText } from '@/shared/lib/download';
import { Dialog } from '@/shared/ui/Dialog';
import { exportFileName, parseImportText, toExport, type ImportSummary } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { useSnapshot } from '@/platform/react/hooks';
import { useRepository } from '@/platform/react/RepositoryProvider';
import { readFileText } from '@/platform/transfer/file';
import { buildDemoSnapshot } from '../demo/demo-project';

type Pending = { snapshot: ProjectSnapshot; summary: ImportSummary | null };

/** Ações globais do cabeçalho: exportar, importar e carregar a demonstração (ambos com confirmação), imprimir, configurações. */
export function ProjectActions() {
  const snapshot = useSnapshot();
  const { repository, clock } = useRepository();
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string[] | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  if (!snapshot) return null;

  const exportNow = () =>
    downloadText(
      exportFileName(snapshot, clock.today()),
      JSON.stringify(toExport(snapshot, clock.now()), null, 2),
    );

  const onFile = async (file: File | undefined) => {
    if (fileInput.current) fileInput.current.value = '';
    if (!file) return;
    const r = parseImportText(await readFileText(file));
    if (!r.ok) return setError(r.error.message.split('\n'));
    setPending(r.value);
  };

  const replace = async () => {
    if (!pending) return;
    await repository.replaceAll(pending.snapshot);
    setPending(null);
    navigate('/');
  };

  return (
    <div className="tb-actions-bar no-print">
      <button type="button" className="ghost" onClick={exportNow}>
        <Download size={16} aria-hidden="true" />
        <span className="tb-action-label">Exportar</span>
      </button>
      <button type="button" className="ghost" onClick={() => fileInput.current?.click()}>
        <Upload size={16} aria-hidden="true" />
        <span className="tb-action-label">Importar</span>
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        aria-label="Importar arquivo"
        className="tb-sr-only"
        tabIndex={-1}
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <button
        type="button"
        className="ghost"
        onClick={() =>
          setPending({
            snapshot: buildDemoSnapshot({ now: clock.now(), today: clock.today(), newId }),
            summary: null,
          })
        }
      >
        <Sparkles size={16} aria-hidden="true" />
        <span className="tb-action-label">Projeto Demo</span>
      </button>
      <button type="button" className="ghost" onClick={() => window.print()}>
        <Printer size={16} aria-hidden="true" />
        <span className="tb-action-label">Imprimir A4</span>
      </button>
      <span className="tb-actions-sep" aria-hidden="true" />
      <NavLink
        to="/projeto/configuracao"
        className={({ isActive }) => `tb-action-link${isActive ? ' active' : ''}`}
      >
        <Settings size={16} aria-hidden="true" />
        <span className="tb-action-label">Configurações</span>
      </NavLink>

      <Dialog open={error !== null} title="Importação recusada" onClose={() => setError(null)}>
        <div role="alert" className="tb-alert-box">
          {error?.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
        <div className="tb-dialog-foot">
          <button type="button" className="primary" onClick={() => setError(null)}>
            Fechar
          </button>
        </div>
      </Dialog>

      <Dialog
        open={pending !== null}
        title={pending?.summary ? 'Importar projeto' : 'Carregar projeto de demonstração'}
        onClose={() => setPending(null)}
      >
        {pending && (
          <>
            {pending.summary ? (
              <>
                <p>
                  <strong>{pending.summary.name}</strong>{' '}
                  <span className="tb-mono">{pending.summary.code}</span>
                </p>
                <ul>
                  {Object.entries(pending.summary.counts).map(([label, n]) => (
                    <li key={label}>
                      {label}: {n}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>
                <strong>{pending.snapshot.project.info.name}</strong>: projeto de engenharia com EAP,
                cronograma, linha de base e indicadores já preenchidos.
              </p>
            )}
            <p>
              <strong>Substituir o projeto atual?</strong>
            </p>
            <p className="tb-hint">Exporte o projeto atual antes de substituir.</p>
            <div className="tb-dialog-foot">
              <button type="button" onClick={exportNow}>
                Exportar atual
              </button>
              <button type="button" onClick={() => setPending(null)}>
                Cancelar
              </button>
              <button type="button" className="danger" onClick={replace}>
                Substituir
              </button>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
