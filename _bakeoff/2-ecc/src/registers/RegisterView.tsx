import { useState, type ReactNode } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import type { ModuleId } from '@/core/module-contract';
import { Badge } from '@/shared/ui/Badge';
import { Dialog } from '@/shared/ui/Dialog';
import { DataTable, type Column } from '@/shared/ui/DataTable';
import { ExampleCard } from '@/shared/ui/ExampleCard';
import { getCollection } from '@/project/registry';
import { getItems } from '@/project/snapshot';
import { removeEntity, upsertEntity } from '@/commands/entities';
import { useCommand, useReadOnly, useSnapshot } from '@/platform/react/hooks';
import { RecordForm, labelErrors, readField, type FieldDef } from './fields';
import type { Example } from './examples';

export type RegisterColumn<E> = Column<E>;

type Props<E extends { id: string }> = {
  module: ModuleId;
  collection: string;
  title: string;
  description?: ReactNode;
  columns: Column<E>[];
  fields: FieldDef[];
  examples: Example<E>[];
  newEntity: () => E;
  /** Ajusta o valor do formulário a cada mudança (ex.: limpar campos incompatíveis) e devolve um aviso opcional. */
  transform?: (prev: E, next: E) => { value: E; notice?: string };
  rowActions?: (row: E) => ReactNode;
  rowClassName?: (row: E) => string | undefined;
  toolbar?: ReactNode;
  /** Valor inicial para abrir o formulário já ao montar (ex.: `?nova=1`). */
  openNew?: boolean;
};

function clearReferences<E>(fields: FieldDef[], value: E): E {
  const out = { ...value } as Record<string, unknown>;
  for (const f of fields) if (f.type === 'reference') out[f.key] = f.multiple ? [] : null;
  return out as E;
}

function byCode(a: object, b: object) {
  const code = (e: object) => String((e as { code?: unknown }).code ?? '');
  return code(a).localeCompare(code(b), 'pt-BR', { numeric: true });
}

/** Cadastro genérico: tabela resumida, diálogo de formulário e exemplos de preenchimento. */
export function RegisterView<E extends { id: string }>(props: Props<E>) {
  const { module, collection, fields, examples, newEntity } = props;
  const snapshot = useSnapshot();
  const run = useCommand();
  const readOnly = useReadOnly();
  const [editing, setEditing] = useState<E | null>(() => (props.openNew ? newEntity() : null));
  const [errors, setErrors] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);
  const [deleting, setDeleting] = useState<E | null>(null);
  const [listError, setListError] = useState<string | null>(null);

  const def = getCollection(module, collection);
  if (!snapshot || !def) return <p className="tb-hint">Carregando…</p>;
  const items = (Object.values(getItems(snapshot, def)) as unknown as E[]).sort(byCode);
  const examplesVisible = items.length === 0 || showExamples;

  const open = (value: E) => {
    setErrors([]);
    setNotice(null);
    setEditing(value);
  };
  const close = () => {
    setEditing(null);
    setErrors([]);
    setNotice(null);
  };
  const save = async () => {
    if (!editing) return;
    const r = await run(upsertEntity(module, collection, editing as E & Record<string, unknown>));
    if (r.ok) close();
    else setErrors(labelErrors(r.error, fields));
  };
  const remove = async () => {
    if (!deleting) return;
    const r = await run(removeEntity(module, collection, deleting.id));
    setDeleting(null);
    setListError(r.ok ? null : r.error.join(' '));
  };
  const applyExample = (ex: Example<E>) =>
    open(clearReferences(fields, { ...newEntity(), ...ex.values, id: '', code: '' } as E));
  const code = (e: E) => String((e as Record<string, unknown>).code ?? '');
  const isNew = editing ? !(editing.id && editing.id in getItems(snapshot, def)) : false;

  const columns: Column<E>[] = [
    { key: 'code', label: 'Código', mono: true, render: (e) => code(e) || '—' },
    ...props.columns,
  ];

  return (
    <div>
      <div className="tb-section-head">
        <div className="tb-row" style={{ gap: 10 }}>
          <h2>{props.title}</h2>
          {items.length > 0 && <Badge text={String(items.length)} tone="gray" />}
        </div>
        <div className="tb-row">
          {props.toolbar}
          {items.length > 0 && examples.length > 0 && (
            <button type="button" className="ghost" onClick={() => setShowExamples((v) => !v)}>
              {showExamples ? 'Ocultar exemplos' : 'Ver exemplos'}
            </button>
          )}
          {!readOnly && (
            <button type="button" className="primary" onClick={() => open(newEntity())}>
              <Plus size={14} /> Novo
            </button>
          )}
        </div>
      </div>
      {props.description}
      {listError && (
        <div role="alert" className="tb-alert-box">
          {listError}
        </div>
      )}
      {examplesVisible && examples.length > 0 && (
        <div className="tb-grid" style={{ marginBottom: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {examples.map((ex) => (
            <ExampleCard
              key={ex.title}
              title={ex.title}
              explanation={ex.explanation}
              details={fields
                .filter((f) => f.type !== 'reference')
                .map((f) => ({ label: f.label, value: readField(ex.values as Record<string, unknown>, f.key) }))
                .filter((d) => d.value !== undefined && d.value !== null && d.value !== '' && !Array.isArray(d.value))
                .slice(0, 4)
                .map((d) => ({ label: d.label, value: String(d.value) }))}
              onUse={readOnly ? undefined : () => applyExample(ex)}
            />
          ))}
        </div>
      )}
      <DataTable
        columns={columns}
        rows={items}
        rowClassName={props.rowClassName}
        empty={examples.length ? 'Nenhum registro ainda — use um exemplo acima como ponto de partida.' : 'Nenhum registro.'}
        actions={(row) => (
          <>
            {props.rowActions?.(row)}
            {!readOnly && (
              <>
                <button type="button" className="icon" title="Editar" aria-label={`Editar ${code(row)}`} onClick={() => open(structuredClone(row))}>
                  <Pencil size={15} />
                </button>
                <button type="button" className="icon" title="Excluir" aria-label={`Excluir ${code(row)}`} onClick={() => setDeleting(row)}>
                  <Trash2 size={15} />
                </button>
              </>
            )}
          </>
        )}
      />
      <Dialog open={editing !== null} title={isNew ? `Novo — ${props.title}` : `Editar ${editing ? code(editing) : ''}`} onClose={close}>
        {editing && (
          <>
            {notice && (
              <div className="tb-card" role="status" style={{ background: 'var(--gold-soft)' }}>
                {notice}
              </div>
            )}
            <RecordForm
              fields={fields}
              value={editing as E & Record<string, unknown>}
              errors={errors}
              onChange={(next) => {
                if (!props.transform) return setEditing(next);
                const t = props.transform(editing, next);
                setEditing(t.value);
                if (t.notice) setNotice(t.notice);
              }}
            />
            <div className="tb-dialog-foot">
              <button type="button" onClick={close}>
                Cancelar
              </button>
              <button type="button" className="primary" onClick={save}>
                Salvar
              </button>
            </div>
          </>
        )}
      </Dialog>
      <Dialog open={deleting !== null} title="Confirmar exclusão" onClose={() => setDeleting(null)}>
        <p>Excluir {deleting ? code(deleting) : ''}?</p>
        <div className="tb-dialog-foot">
          <button type="button" onClick={() => setDeleting(null)}>
            Cancelar
          </button>
          <button type="button" className="danger" onClick={remove}>
            Confirmar
          </button>
        </div>
      </Dialog>
    </div>
  );
}
