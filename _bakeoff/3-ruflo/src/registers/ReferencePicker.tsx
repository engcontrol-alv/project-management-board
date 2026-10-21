import { useState } from 'react';
import type { Entity, ModuleId } from '@/core/module-contract';
import { compareCodes } from '@/shared/lib/codes';
import { useSnapshot } from '@/platform/react/hooks';
import { getCollection, manifestOf } from '@/project/registry';
import { getItems } from '@/project/snapshot';

/** Lista `describe()` dos registros-alvo, filtrados pelo predicado do manifest-alvo, com busca. */
export function ReferencePicker({
  id,
  label,
  module,
  collection,
  multiple,
  constraint,
  exclude,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  module: ModuleId;
  collection: string;
  multiple?: boolean;
  constraint?: string;
  exclude?: (target: Entity) => boolean;
  value: string | string[] | null;
  onChange: (v: string | string[] | null) => void;
  disabled?: boolean;
}) {
  const snapshot = useSnapshot();
  const [query, setQuery] = useState('');
  const def = getCollection(module, collection);
  if (!snapshot || !def) return null;
  const check = constraint ? manifestOf(module)?.constraints[constraint] : undefined;
  const options = Object.values(getItems(snapshot, def))
    .filter((e) => !check || check(e) === null)
    .filter((e) => !exclude || !exclude(e))
    .map((e) => ({ id: e.id, label: def.describe(e) }))
    .sort((a, b) => compareCodes(a.label, b.label));
  const q = query.trim().toLowerCase();
  const visible = q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  const search = options.length > 6 && (
    <input
      type="text"
      className="input small"
      placeholder="Buscar…"
      aria-label={`Buscar em ${label}`}
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
  );

  if (multiple) {
    const selected = new Set(Array.isArray(value) ? value : []);
    return (
      <fieldset id={id} aria-label={label} disabled={disabled}>
        {search}
        {options.length === 0 && <span className="muted small">Nenhum registro disponível.</span>}
        <div className="checks">
          {visible.map((o) => (
            <label key={o.id}>
              <input
                type="checkbox"
                checked={selected.has(o.id)}
                onChange={(e) => {
                  const next = new Set(selected);
                  if (e.target.checked) next.add(o.id);
                  else next.delete(o.id);
                  onChange([...next]);
                }}
              />
              {o.label}
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const current = typeof value === 'string' ? value : '';
  return (
    <>
      {search}
      <select id={id} value={current} disabled={disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— nenhum —</option>
        {visible.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
        {current && !visible.some((o) => o.id === current) && <option value={current}>(vínculo atual)</option>}
      </select>
    </>
  );
}
