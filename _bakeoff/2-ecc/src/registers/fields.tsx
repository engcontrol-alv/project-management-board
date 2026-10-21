import { useEffect, useId, useState, type ReactNode } from 'react';
import type { ModuleId } from '@/core/module-contract';
import { centsToInput, parseMoneyBR } from '@/shared/lib/money';
import { ReferencePicker } from './ReferencePicker';

/* eslint-disable @typescript-eslint/no-explicit-any -- definições de campo operam sobre valores de formulário genéricos */
type FormValue = any;

export type FieldDef = {
  key: string;
  label: string;
  hint?: string;
  required?: boolean;
  visible?: (v: FormValue) => boolean;
  readOnly?: boolean;
} & (
  | { type: 'text' | 'textarea' | 'date' | 'boolean' }
  | { type: 'number'; min?: number; max?: number; integer?: boolean }
  | { type: 'money' }
  | { type: 'select'; options: readonly string[] | ((v: FormValue) => readonly string[]); nullable?: boolean }
  | { type: 'multiselect'; options: readonly string[] }
  | {
      type: 'reference';
      module: ModuleId;
      collection: string;
      multiple?: boolean;
      constraint?: string;
      exclude?: (v: FormValue) => string[];
    }
);
/* eslint-enable @typescript-eslint/no-explicit-any */

export function readField(value: Record<string, unknown>, key: string): unknown {
  return key.split('.').reduce<unknown>((cur, k) => (cur && typeof cur === 'object' ? (cur as Record<string, unknown>)[k] : undefined), value);
}

export function writeField<T extends Record<string, unknown>>(value: T, key: string, v: unknown): T {
  const [head, ...rest] = key.split('.');
  if (!rest.length) return { ...value, [head!]: v };
  const inner = (value[head!] ?? {}) as Record<string, unknown>;
  return { ...value, [head!]: writeField(inner, rest.join('.'), v) };
}

function MoneyInput({ id, value, onChange, disabled }: { id: string; value: number | null; onChange: (v: number | null) => void; disabled?: boolean }) {
  const [text, setText] = useState(centsToInput(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(centsToInput(value)), [value]);
  return (
    <>
      <input
        id={id}
        inputMode="decimal"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          if (!text.trim()) {
            setInvalid(false);
            onChange(null);
            return;
          }
          const cents = parseMoneyBR(text);
          setInvalid(cents === null);
          if (cents !== null) onChange(cents);
        }}
      />
      {invalid && <span className="tb-error tb-hint">Valor inválido (ex.: R$ 1.234,56)</span>}
    </>
  );
}

function FieldInput({ field, value, onChange, disabled }: { field: FieldDef; value: Record<string, unknown>; onChange: (v: unknown) => void; disabled: boolean }) {
  const id = useId();
  const current = readField(value, field.key);
  const ro = disabled || field.readOnly;
  let input: ReactNode;
  switch (field.type) {
    case 'text':
      input = <input id={id} value={(current as string) ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'textarea':
      input = <textarea id={id} rows={3} value={(current as string) ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'date':
      input = <input id={id} type="date" value={(current as string) ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value || null)} />;
      break;
    case 'boolean':
      input = <input id={id} type="checkbox" checked={current === true} disabled={ro} onChange={(e) => onChange(e.target.checked)} />;
      break;
    case 'number':
      input = (
        <input
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          step={field.integer ? 1 : 'any'}
          value={current === null || current === undefined ? '' : String(current)}
          disabled={ro}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />
      );
      break;
    case 'money':
      input = <MoneyInput id={id} value={(current as number | null) ?? null} onChange={onChange} disabled={ro} />;
      break;
    case 'select': {
      const options = typeof field.options === 'function' ? field.options(value) : field.options;
      input = (
        <select id={id} value={(current as string) ?? ''} disabled={ro} onChange={(e) => onChange(e.target.value === '' && field.nullable ? null : e.target.value)}>
          <option value="">{field.nullable ? '—' : 'Selecione…'}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
      break;
    }
    case 'multiselect': {
      const selected = (current as string[]) ?? [];
      return (
        <fieldset className="tb-field tb-field-wide">
          <legend>{field.label}</legend>
          <div className="tb-choices">
            {field.options.map((o) => (
              <label key={o} className="tb-choice">
                <input
                  type="checkbox"
                  disabled={ro}
                  checked={selected.includes(o)}
                  onChange={(e) => onChange(e.target.checked ? [...selected, o] : selected.filter((s) => s !== o))}
                />
                {o}
              </label>
            ))}
          </div>
          {field.hint && <div className="tb-hint">{field.hint}</div>}
        </fieldset>
      );
    }
    case 'reference': {
      const exclude = field.exclude?.(value);
      if (field.multiple) {
        return (
          <fieldset className="tb-field tb-field-wide">
            <legend>{field.label}</legend>
            <ReferencePicker
              multiple
              module={field.module}
              collection={field.collection}
              constraint={field.constraint}
              exclude={exclude}
              disabled={ro}
              value={(current as string[]) ?? []}
              onChange={onChange}
            />
            {field.hint && <div className="tb-hint">{field.hint}</div>}
          </fieldset>
        );
      }
      input = (
        <ReferencePicker
          id={id}
          module={field.module}
          collection={field.collection}
          constraint={field.constraint}
          exclude={exclude}
          disabled={ro}
          value={(current as string | null) ?? null}
          onChange={onChange}
        />
      );
      break;
    }
  }
  if (field.type === 'boolean') {
    return (
      <div className="tb-field">
        <div className="tb-row" style={{ flexWrap: 'nowrap', minHeight: 34 }}>
          {input}
          <label htmlFor={id} className="tb-field-label">
            {field.label}
          </label>
        </div>
        {field.hint && <div className="tb-hint">{field.hint}</div>}
      </div>
    );
  }
  return (
    <div className={field.type === 'textarea' ? 'tb-field tb-field-wide' : 'tb-field'}>
      <label htmlFor={id} className="tb-field-label">
        {field.label}
      </label>
      {input}
      {field.hint && <div className="tb-hint">{field.hint}</div>}
    </div>
  );
}

export function RecordForm<V extends Record<string, unknown>>({
  fields,
  value,
  onChange,
  errors = [],
  disabled = false,
}: {
  fields: FieldDef[];
  value: V;
  onChange: (v: V) => void;
  errors?: string[];
  disabled?: boolean;
}) {
  return (
    <div className="tb-form">
      {errors.length > 0 && (
        <div role="alert" className="tb-alert-box">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {fields
        .filter((f) => !f.visible || f.visible(value))
        .map((f) => (
          <FieldInput key={f.key} field={f} value={value} disabled={disabled} onChange={(v) => onChange(writeField(value, f.key, v))} />
        ))}
    </div>
  );
}

/** Troca o caminho técnico do erro (`standard: …`) pelo rótulo do campo. */
export function labelErrors(errors: string[], fields: FieldDef[]): string[] {
  return errors.map((e) => {
    const idx = e.indexOf(': ');
    if (idx < 0) return e;
    const path = e.slice(0, idx);
    const field = fields.find((f) => f.key === path) ?? fields.find((f) => path.startsWith(`${f.key}.`));
    return field ? `${field.label}: ${e.slice(idx + 2)}` : e;
  });
}
