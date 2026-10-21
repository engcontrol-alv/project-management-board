import { useEffect, useState, type ReactNode } from 'react';
import { centsToInput, parseMoneyBR } from '../lib/money';

export function Field({
  id,
  label,
  hint,
  children,
  className,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`field ${className ?? ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/** Entrada monetária pt-BR ("R$ 1.234,56") normalizada para centavos ao sair do campo. */
export function MoneyInput({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: number | null;
  onChange: (cents: number | null) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState(centsToInput(value));
  const [invalid, setInvalid] = useState(false);
  useEffect(() => setText(centsToInput(value)), [value]);
  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={text}
      disabled={disabled}
      aria-invalid={invalid}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        if (text.trim() === '') {
          setInvalid(false);
          onChange(null);
          return;
        }
        const cents = parseMoneyBR(text);
        setInvalid(cents === null);
        if (cents !== null) onChange(cents);
      }}
    />
  );
}
