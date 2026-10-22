import { useState } from 'react';
import { Eye, Printer } from 'lucide-react';
import { Dialog } from '@/shared/ui/Dialog';
import type { ImplementedModuleId } from '@/project/registry';
import {
  availableSections,
  NOTES_MAX,
  PRESETS,
  presetSelection,
  REPORT_SECTIONS,
  type ReportRequest,
  type ReportSectionId,
} from './report-config';

const sameSet = (a: Set<string>, b: Set<string>) =>
  a.size === b.size && [...a].every((x) => b.has(x));

/** Compositor do Relatório Executivo A4: presets, seções e notas da emissão. */
export function ReportComposer({
  open,
  enabled,
  onClose,
  onGenerate,
}: {
  open: boolean;
  enabled: Record<ImplementedModuleId, boolean>;
  onClose: () => void;
  onGenerate: (request: ReportRequest, print: boolean) => void;
}) {
  const available = availableSections(enabled);
  const [selected, setSelected] = useState<Set<ReportSectionId>>(() =>
    presetSelection('board', enabled),
  );
  const [notes, setNotes] = useState('');
  // Um módulo desligado depois da última abertura nunca fica marcado.
  const effective = new Set([...selected].filter((id) => available.has(id)));

  const toggle = (id: ReportSectionId, on: boolean) => {
    const next = new Set(effective);
    if (on) next.add(id);
    else next.delete(id);
    setSelected(next);
  };
  const generate = (print: boolean) =>
    onGenerate({ sections: effective, notes: notes.trim() }, print);
  const empty = effective.size === 0;

  return (
    <Dialog
      open={open}
      title="Relatório executivo A4"
      onClose={onClose}
      actions={
        <>
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn" onClick={() => generate(false)} disabled={empty}>
            <Eye size={14} aria-hidden="true" /> Pré-visualizar
          </button>
          <button className="btn btn-primary" onClick={() => generate(true)} disabled={empty}>
            <Printer size={14} aria-hidden="true" /> Gerar e Imprimir A4
          </button>
        </>
      }
    >
      <div className="report-composer">
        <div className="segmented" role="group" aria-label="Perfis rápidos">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={sameSet(effective, presetSelection(p.id, enabled))}
              onClick={() => setSelected(presetSelection(p.id, enabled))}
            >
              {p.label}
            </button>
          ))}
        </div>
        <fieldset className="report-sections-pick">
          <legend>Seções</legend>
          {REPORT_SECTIONS.map((s) => {
            const on = available.has(s.id);
            return (
              <label key={s.id} className={on ? undefined : 'muted'}>
                <input
                  type="checkbox"
                  checked={effective.has(s.id)}
                  disabled={!on}
                  onChange={(e) => toggle(s.id, e.target.checked)}
                />
                <span>
                  {s.label}
                  {!on && <em className="small"> (módulo desligado)</em>}
                </span>
              </label>
            );
          })}
        </fieldset>
        <div className="field">
          <label htmlFor="report-notes">Observações executivas / notas da emissão</label>
          <textarea
            id="report-notes"
            rows={3}
            maxLength={NOTES_MAX}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <span className="hint">
            Opcional; sai no topo do relatório. {notes.length}/{NOTES_MAX}
          </span>
        </div>
      </div>
    </Dialog>
  );
}
