import { useEffect, useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { Entity, ModuleId } from '@/core/module-contract';
import { compareCodes } from '@/shared/lib/codes';
import { formatDateBR, isIsoDate } from '@/shared/lib/dates';
import { newId } from '@/shared/lib/ids';
import { formatMoneyBR } from '@/shared/lib/money';
import { DataTable, type Column } from '@/shared/ui/DataTable';
import { Dialog, ErrorList } from '@/shared/ui/Dialog';
import { ExampleCard } from '@/shared/ui/ExampleCard';
import { removeEntity, upsertEntity } from '@/commands/entities';
import { isClosed } from '@/commands/guard';
import { useCommand, useSnapshot } from '@/platform/react/hooks';
import { getCollection } from '@/project/registry';
import { getItems } from '@/project/snapshot';
import { RecordForm } from './RecordForm';
import { getPath, type Example, type FieldDef, type Values } from './types';

export type DraftChange = (prev: Values, next: Values) => { value: Values; notice?: string };

export type RegisterViewProps<E extends Entity> = {
  module: ModuleId;
  collection: string;
  title: string;
  columns: Column<E>[];
  fields: FieldDef[];
  examples: Example<E>[];
  newEntity: () => Values;
  onDraftChange?: DraftChange;
  rowActions?: (e: E) => ReactNode;
  rowClassName?: (e: E) => string | undefined;
  summary?: ReactNode;
  /** Abre o formulário de novo registro ao montar (ex.: `?nova=1`). */
  openNew?: boolean;
};

function exampleValue(f: FieldDef, v: unknown): string | null {
  if (v === null || v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) return null;
  if (f.type === 'boolean') return v ? 'Sim' : 'Não';
  if (f.type === 'money' && typeof v === 'number') return formatMoneyBR(v);
  if (isIsoDate(v)) return formatDateBR(v);
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

export function RegisterView<E extends Entity>(props: RegisterViewProps<E>) {
  const { module, collection, title, columns, fields, examples, newEntity, onDraftChange } = props;
  const snapshot = useSnapshot();
  const command = useCommand();
  const [draft, setDraft] = useState<Values | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [listError, setListError] = useState<string[]>([]);
  const [showExamples, setShowExamples] = useState(false);
  const [toDelete, setToDelete] = useState<E | null>(null);
  const def = getCollection(module, collection);

  const open = (value: Values, fresh: boolean) => {
    setDraft(value);
    setIsNew(fresh);
    setErrors([]);
    setNotice(null);
  };

  useEffect(() => {
    if (props.openNew) open({ ...newEntity(), id: newId() }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.openNew]);

  if (!snapshot || !def) return null;
  const readOnly = isClosed(snapshot);
  const rows = Object.values(getItems<E>(snapshot, def)).sort((a, b) =>
    compareCodes(String((a as Values).code ?? ''), String((b as Values).code ?? '')),
  );

  const applyExample = (ex: Example<E>) => {
    const value: Values = { ...newEntity(), ...(ex.values as Values), id: newId(), code: '' };
    for (const ref of def.refs) if (!ref.field.includes('.')) value[ref.field] = ref.many ? [] : null;
    open(value, true);
  };

  const save = async () => {
    if (!draft) return;
    const r = await command(upsertEntity(module, collection, draft as Entity & Values));
    if (r.ok) setDraft(null);
    else setErrors(r.error);
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const r = await command(removeEntity(module, collection, toDelete.id));
    setToDelete(null);
    setListError(r.ok ? [] : r.error);
  };

  const exampleCards = examples.map((ex) => (
    <ExampleCard
      key={ex.title}
      title={ex.title}
      explanation={ex.explanation}
      disabled={readOnly}
      onUse={() => applyExample(ex)}
      entries={fields.flatMap((f) => {
        const text = exampleValue(f, getPath(ex.values as Values, f.key));
        return text === null ? [] : [{ label: f.label, value: text, hint: f.hint }];
      })}
    />
  ));

  return (
    <div>
      <div className="page-head">
        <h1 style={{ flex: 1 }}>{title}</h1>
        {rows.length > 0 && examples.length > 0 && (
          <button className="btn-link small" onClick={() => setShowExamples((v) => !v)}>
            {showExamples ? 'Ocultar exemplos' : 'Ver exemplos'}
          </button>
        )}
        <button className="btn btn-primary" disabled={readOnly} onClick={() => open({ ...newEntity(), id: newId() }, true)}>
          <Plus size={14} /> Novo
        </button>
      </div>
      {props.summary}
      <ErrorList errors={listError} />
      {(rows.length === 0 || showExamples) && examples.length > 0 && (
        <div>
          {rows.length === 0 && (
            <p className="muted small">
              Nenhum registro ainda. Os exemplos abaixo explicam os campos e não são salvos — use um como modelo ou
              crie do zero.
            </p>
          )}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
            {exampleCards}
          </div>
        </div>
      )}
      {rows.length > 0 && (
        <div className="card flush">
          <DataTable
            columns={columns}
            rows={rows}
            rowClassName={props.rowClassName}
            actions={(row) => (
              <span className="row" style={{ justifyContent: 'flex-end', flexWrap: 'nowrap', gap: 4 }}>
                {props.rowActions?.(row)}
                <button className="btn btn-sm btn-ghost btn-icon" aria-label={`Editar ${def.describe(row)}`} disabled={readOnly} onClick={() => open(structuredClone(row) as Values, false)}>
                  <Pencil size={13} />
                </button>
                <button className="btn btn-sm btn-ghost btn-icon btn-danger" aria-label={`Excluir ${def.describe(row)}`} disabled={readOnly} onClick={() => setToDelete(row)}>
                  <Trash2 size={13} />
                </button>
              </span>
            )}
          />
        </div>
      )}

      <Dialog
        open={draft !== null}
        title={isNew ? `Novo — ${title}` : `Editar ${String(draft?.code ?? '')}`.trim()}
        onClose={() => setDraft(null)}
        actions={
          <>
            <button className="btn" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={save}>
              Salvar
            </button>
          </>
        }
      >
        {notice && <div className="notice">{notice}</div>}
        {draft && (
          <RecordForm
            fields={fields}
            value={draft}
            errors={errors}
            onChange={(next) => {
              if (!onDraftChange) return setDraft(next);
              const r = onDraftChange(draft, next);
              setDraft(r.value);
              if (r.notice) setNotice(r.notice);
            }}
          />
        )}
      </Dialog>

      <Dialog
        open={toDelete !== null}
        title="Excluir registro"
        onClose={() => setToDelete(null)}
        actions={
          <>
            <button className="btn" onClick={() => setToDelete(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" onClick={confirmDelete}>
              Excluir
            </button>
          </>
        }
      >
        <p>Excluir {toDelete ? def.describe(toDelete) : ''}? O código não será reutilizado.</p>
      </Dialog>
    </div>
  );
}
