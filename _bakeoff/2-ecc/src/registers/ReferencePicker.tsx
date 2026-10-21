import { useState } from 'react';
import type { ModuleId } from '@/core/module-contract';
import { constraintOf, getCollection } from '@/project/registry';
import { getItems } from '@/project/snapshot';
import { useSnapshot } from '@/platform/react/hooks';

type Props = {
  module: ModuleId;
  collection: string;
  constraint?: string;
  exclude?: string[];
  id?: string;
  disabled?: boolean;
} & (
  | { multiple?: false; value: string | null; onChange: (v: string | null) => void }
  | { multiple: true; value: string[]; onChange: (v: string[]) => void }
);

/** Escolha de registros-alvo por `describe()`, filtrada pelo predicado do manifest-alvo. */
export function ReferencePicker(props: Props) {
  const snapshot = useSnapshot();
  const [query, setQuery] = useState('');
  const def = getCollection(props.module, props.collection);
  const check = props.constraint ? constraintOf(props.module, props.constraint) : undefined;
  const options =
    snapshot && def
      ? Object.values(getItems(snapshot, def))
          .filter((item) => !props.exclude?.includes(item.id) && (!check || check(item) === null))
          .map((item) => ({ id: item.id, label: def.describe(item) }))
          .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR', { numeric: true }))
      : [];

  if (!props.multiple) {
    const { value, onChange } = props;
    return (
      <select id={props.id} value={value ?? ''} disabled={props.disabled} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    );
  }

  const { value, onChange } = props;
  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      {options.length > 6 && (
        <input placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar" />
      )}
      <div className="tb-choices" style={{ maxHeight: 220, overflow: 'auto', marginTop: 6 }}>
        {filtered.length === 0 && <span className="tb-hint">Nenhum registro disponível.</span>}
        {filtered.map((o) => (
          <label key={o.id} className="tb-choice">
            <input
              type="checkbox"
              disabled={props.disabled}
              checked={value.includes(o.id)}
              onChange={(e) => onChange(e.target.checked ? [...value, o.id] : value.filter((v) => v !== o.id))}
            />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}
