import { useState } from 'react';
import { FolderOpen, Plus, Sparkles } from 'lucide-react';
import { newId } from '@/shared/lib/ids';
import { Card } from '@/shared/ui/Card';
import { newProjectSnapshot } from '@/commands/project';
import { parseImportText } from '@/project/serialization';
import type { ProjectSnapshot } from '@/project/snapshot';
import type { ProjectRepository } from '@/platform/persistence/repository';
import type { Clock } from '@/platform/react/RepositoryProvider';
import { readFileText } from '@/platform/transfer/file';
import { buildDemoSnapshot } from '../demo/demo-project';

/** Navegador limpo: nada é gravado até "Criar projeto", "Importar projeto" ou carregar a demonstração. */
export function StartPage({
  repository,
  clock,
  onReady,
}: {
  repository: ProjectRepository;
  clock: Clock;
  onReady: () => void;
}) {
  const [info, setInfo] = useState({ name: '', code: '', startDate: '' });
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const persist = async (snapshot: ProjectSnapshot) => {
    setBusy(true);
    try {
      await repository.replaceAll(snapshot);
      onReady();
    } catch {
      setErrors(['Não foi possível salvar. Verifique se o navegador permite armazenamento local.']);
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const r = newProjectSnapshot(info, { now: clock.now(), today: clock.today(), newId });
    if (!r.ok) {
      setErrors(r.error.map((e) => e.replace(/^name:/, 'Nome:').replace(/^code:/, 'Código:').replace(/^startDate:/, 'Data de início:')));
      return;
    }
    await persist(r.value);
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    const r = parseImportText(await readFileText(file));
    if (!r.ok) {
      setErrors(r.error.message.split('\n'));
      return;
    }
    await persist(r.value.snapshot);
  };

  const loadDemo = () => persist(buildDemoSnapshot({ now: clock.now(), today: clock.today(), newId }));

  return (
    <main className="tb-start">
      <div className="tb-start-hero">
        <h2>Comece um projeto</h2>
        <p>
          Painel executivo de um projeto organizado nos domínios de desempenho do PMBOK. Seus dados ficam apenas neste
          navegador.
        </p>
      </div>
      {errors.length > 0 && (
        <div role="alert" className="tb-alert-box">
          {errors.map((e) => (
            <div key={e}>{e}</div>
          ))}
        </div>
      )}
      <div className="tb-start-grid">
        <Card title="Novo projeto">
          <label className="tb-field">
            <span>Nome do projeto</span>
            <input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} />
          </label>
          <div className="tb-form" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)' }}>
            <label className="tb-field">
              <span>Código (até 12 caracteres)</span>
              <input className="tb-mono" value={info.code} maxLength={12} onChange={(e) => setInfo({ ...info, code: e.target.value })} />
            </label>
            <label className="tb-field">
              <span>Data de início</span>
              <input type="date" value={info.startDate} onChange={(e) => setInfo({ ...info, startDate: e.target.value })} />
            </label>
          </div>
          <button type="button" className="primary" disabled={busy} onClick={create}>
            <Plus size={15} /> Criar projeto
          </button>
        </Card>
        <Card title="Já tem uma exportação?">
          <label className="tb-field">
            <span className="tb-row" style={{ gap: 6 }}>
              <FolderOpen size={14} /> Importar projeto
            </span>
            <input type="file" accept="application/json,.json" disabled={busy} onChange={(e) => importFile(e.target.files?.[0])} />
          </label>
          <div className="tb-hint">Arquivo .json gerado por "Exportar" nesta aplicação.</div>
        </Card>
      </div>
      <div className="tb-start-demo">
        <span>Quer ver o painel funcionando? Um projeto de engenharia com EAP, cronograma, linha de base e indicadores já preenchidos.</span>
        <button type="button" className="ghost" disabled={busy} onClick={loadDemo}>
          <Sparkles size={15} /> Carregar Projeto de Demonstração
        </button>
      </div>
    </main>
  );
}
