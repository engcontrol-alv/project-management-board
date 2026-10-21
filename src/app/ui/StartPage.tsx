import { useState, type FormEvent } from 'react';
import { FolderOpen, Plus, Sparkles } from 'lucide-react';
import type { IsoDate } from '@/shared/lib/dates';
import { issuesToMessages, ptErrorMap } from '@/shared/lib/zod';
import { ErrorList } from '@/shared/ui/Dialog';
import { Field } from '@/shared/ui/fields';
import { readFileText } from '@/platform/transfer/file';
import { projectInfoSchema, type ProjectInfo } from '@/project/project';
import { parseImportFile } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import { BrandMark } from '@/shared/ui/BrandMark';

const LABELS = { name: 'Nome', code: 'Código', startDate: 'Data de início' };

export function StartPage({
  today,
  onCreate,
  onImport,
  onLoadDemo,
}: {
  today: IsoDate;
  onCreate: (info: ProjectInfo) => Promise<void>;
  onImport: (s: ProjectSnapshot) => Promise<void>;
  /** Carrega o projeto fictício de demonstração (só por ação explícita). */
  onLoadDemo?: () => Promise<void>;
}) {
  const [info, setInfo] = useState<ProjectInfo>({ name: '', code: '', startDate: today });
  const [errors, setErrors] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = projectInfoSchema.safeParse(info, { errorMap: ptErrorMap });
    if (!parsed.success) return setErrors(issuesToMessages(parsed.error, LABELS));
    await onCreate(info);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const r = await parseImportFile(await readFileText(file));
    if (!r.ok) return setImportError(r.error.message);
    setImportError(null);
    await onImport(r.value.snapshot);
  };

  return (
    <div className="start">
      <header className="start-hero">
        <div className="row" style={{ gap: 10 }}>
          <BrandMark />
          <span className="brand">Project Management Board</span>
        </div>
        <h1>Governança, escopo e cronograma de um projeto, em um só painel.</h1>
        <p className="muted">
          Organizado nos domínios do PMBOK, com caminho crítico, linha de base e RAG calculados. Nenhum dado é
          gravado até você criar ou importar um projeto, e tudo fica apenas neste navegador.
        </p>
      </header>
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', alignItems: 'start' }}>
        <form className="card" onSubmit={create} aria-label="Criar projeto">
          <h2>Novo projeto</h2>
          <p className="muted small" style={{ marginTop: 0 }}>Comece do zero; os cadastros vazios mostram exemplos de preenchimento.</p>
          <ErrorList errors={errors} />
          <Field id="start-name" label="Nome">
            <input id="start-name" type="text" value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          </Field>
          <Field id="start-code" label="Código" hint="Até 12 caracteres.">
            <input id="start-code" type="text" maxLength={12} value={info.code} onChange={(e) => setInfo({ ...info, code: e.target.value })} />
          </Field>
          <Field id="start-date" label="Data de início">
            <input id="start-date" type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
          </Field>
          <button type="submit" className="btn btn-primary">
            <Plus size={14} /> Criar projeto
          </button>
        </form>
        <div className="card">
          <h2>Projeto existente</h2>
          <p className="muted small">Arquivo .json exportado por esta aplicação. Ele é validado antes de qualquer gravação.</p>
          {importError && <div className="errors" role="alert">{importError}</div>}
          <label className="btn" htmlFor="start-import">
            <FolderOpen size={14} /> Importar projeto
          </label>
          <input
            id="start-import"
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {onLoadDemo && (
        <div className="demo">
          <button className="btn btn-ghost" onClick={() => void onLoadDemo()}>
            <Sparkles size={14} aria-hidden="true" /> Carregar projeto de demonstração
          </button>
          <p className="muted small" style={{ margin: '4px 0 0' }}>
            Projeto fictício de engenharia, em andamento, para explorar painel, EAP, Gantt e Curva S.
          </p>
        </div>
      )}
    </div>
  );
}
