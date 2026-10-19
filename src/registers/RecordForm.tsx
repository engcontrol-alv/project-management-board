import { Field, MoneyInput } from '@/shared/ui/fields';
import { ErrorList } from '@/shared/ui/Dialog';
import { useAnalysis } from '@/platform/react/hooks';
import { isImplemented } from '@/project/registry';
import { ReferencePicker } from './ReferencePicker';
import { getPath, prettifyErrors, setPath, type FieldDef, type Values } from './types';

/** Formulário gerado a partir de `FieldDef[]`, com `hint` sob cada campo. */
export function RecordForm({
  fields,
  value,
  onChange,
  errors = [],
  disabled,
}: {
  fields: FieldDef[];
  value: Values;
  onChange: (v: Values) => void;
  errors?: string[];
  disabled?: boolean;
}) {
  const analysis = useAnalysis();
  const moduleOn = (m: string) =>
    m === 'stakeholders' || !isImplemented(m) || (analysis?.config.enabled[m] ?? true);
  const shown = fields.filter(
    (f) => (!f.visible || f.visible(value)) && (f.type !== 'reference' || moduleOn(f.module)),
  );
  return (
    <fieldset disabled={disabled}>
      <ErrorList errors={prettifyErrors(errors, fields)} />
      <div className="form-grid">
        {shown.map((f) => (
          <FieldControl
            key={f.key}
            field={f}
            values={value}
            value={getPath(value, f.key)}
            onChange={(v) => onChange(setPath(value, f.key, v))}
          />
        ))}
      </div>
    </fieldset>
  );
}

function FieldControl({
  field: f,
  values,
  value,
  onChange,
}: {
  field: FieldDef;
  values: Values;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `f-${f.key.replace(/\./g, '-')}`;
  const wide = f.wide || f.type === 'textarea' || f.type === 'multiselect' || (f.type === 'reference' && f.multiple);
  const wrap = (control: React.ReactNode) => (
    <Field id={id} label={f.label} hint={f.hint} className={wide ? 'wide' : undefined}>
      {control}
    </Field>
  );
  const str = typeof value === 'string' ? value : '';

  switch (f.type) {
    case 'text':
      return wrap(<input id={id} type="text" value={str} readOnly={f.readOnly} onChange={(e) => onChange(e.target.value)} />);
    case 'textarea':
      return wrap(<textarea id={id} rows={2} value={str} onChange={(e) => onChange(e.target.value)} />);
    case 'date':
      return wrap(<input id={id} type="date" value={str} onChange={(e) => onChange(e.target.value || null)} />);
    case 'boolean':
      return wrap(<input id={id} type="checkbox" checked={value === true} onChange={(e) => onChange(e.target.checked)} />);
    case 'number':
      return wrap(
        <input
          id={id}
          type="number"
          min={f.min}
          max={f.max}
          step={f.integer ? 1 : 'any'}
          value={typeof value === 'number' ? value : ''}
          onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        />,
      );
    case 'money':
      return wrap(<MoneyInput id={id} value={typeof value === 'number' ? value : null} onChange={onChange} />);
    case 'select': {
      const options = typeof f.options === 'function' ? f.options(values) : f.options;
      return wrap(
        <select id={id} value={str} onChange={(e) => onChange(e.target.value === '' ? (f.nullable ? null : '') : e.target.value)}>
          <option value="">{f.nullable ? '— nenhum —' : 'Selecione…'}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>,
      );
    }
    case 'multiselect': {
      const selected = new Set(Array.isArray(value) ? (value as string[]) : []);
      return wrap(
        <div className="checks" id={id} role="group" aria-label={f.label}>
          {f.options.map((o) => (
            <label key={o}>
              <input
                type="checkbox"
                checked={selected.has(o)}
                onChange={(e) => onChange(f.options.filter((x) => (x === o ? e.target.checked : selected.has(x))))}
              />
              {o}
            </label>
          ))}
        </div>,
      );
    }
    case 'reference':
      return wrap(
        <ReferencePicker
          id={id}
          label={f.label}
          module={f.module}
          collection={f.collection}
          multiple={f.multiple}
          constraint={f.constraint}
          exclude={f.exclude ? (t) => f.exclude!(t, values) : undefined}
          value={(value as string | string[] | null) ?? (f.multiple ? [] : null)}
          onChange={onChange}
        />,
      );
  }
}
