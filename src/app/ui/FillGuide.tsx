import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Circle, CircleCheck, ListChecks } from 'lucide-react';
import type { ImplementedModuleId } from '@/project/registry';
import type { ProjectSnapshot } from '@/project/snapshot';
import { fillGuideSteps, guideProgress } from './fill-guide';

type Pref = 'aberto' | 'oculto';

export const guideStorageKey = (projectId: string) => `pmb.guia-preenchimento.${projectId}`;

// Preferência é conveniência por navegador: sem storage (modo privado etc.), vale o padrão.
function readPref(key: string): Pref | null {
  try {
    const v = localStorage.getItem(key);
    return v === 'aberto' || v === 'oculto' ? v : null;
  } catch {
    return null;
  }
}

function writePref(key: string, v: Pref) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* sem storage: a preferência vale só nesta sessão */
  }
}

/** Guia Rápido de Ordem de Preenchimento (aba Geral; nunca impresso). */
export function FillGuide({
  snapshot,
  enabled,
}: {
  snapshot: ProjectSnapshot;
  enabled: Record<ImplementedModuleId, boolean>;
}) {
  const steps = fillGuideSteps(snapshot, enabled);
  const progress = guideProgress(steps);
  const key = guideStorageKey(snapshot.project.id);
  const [pref, setPref] = useState<Pref | null>(() => readPref(key));
  // Sem preferência salva: aberto até concluir os passos iniciais.
  const open = (pref ?? (progress.done === progress.total ? 'oculto' : 'aberto')) === 'aberto';
  const counter = `${progress.done}/${progress.total} passos iniciais concluídos`;
  const set = (v: Pref) => {
    setPref(v);
    writePref(key, v);
  };

  if (!open)
    return (
      <div className="fill-guide-toggle no-print">
        <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('aberto')}>
          <ListChecks size={14} aria-hidden="true" /> Guia de Preenchimento
          <span className="muted small">· {counter}</span>
        </button>
      </div>
    );

  return (
    <section
      className="card tb-card fill-guide no-print"
      aria-label="Guia de Preenchimento do Projeto"
    >
      <div className="card-head">
        <h2>Guia de Preenchimento do Projeto</h2>
        <div className="row" style={{ alignItems: 'center' }}>
          <span className="muted small">{counter}</span>
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => set('oculto')}>
            Ocultar guia
          </button>
        </div>
      </div>
      <ol className="fill-guide-steps">
        {steps.map((s, i) => (
          <li key={s.id} className={s.done ? 'done' : undefined}>
            <span className="fill-guide-mark">
              {s.done === null ? (
                <span className="tb-mono">{i + 1}</span>
              ) : s.done ? (
                <CircleCheck size={16} color="var(--green)" role="img" aria-label="Concluído" />
              ) : (
                <Circle size={16} color="var(--ink-faint)" role="img" aria-label="Pendente" />
              )}
            </span>
            <div className="fill-guide-body">
              <strong>{s.title}</strong>
              <div className="muted small">{s.text}</div>
            </div>
            <div className="fill-guide-links">
              {s.links.map((l) => (
                <Link key={l.label} to={l.to} className="btn btn-sm">
                  {l.label}
                </Link>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
