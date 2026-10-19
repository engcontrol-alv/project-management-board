import type { Entity, ModuleId } from '@/core/module-contract';

export type Values = Record<string, unknown>;

export type FieldDef = {
  /** Aceita caminho com ponto (`'charter.objective'`). */
  key: string;
  label: string;
  hint?: string;
  visible?: (v: Values) => boolean;
  wide?: boolean;
  readOnly?: boolean;
} & (
  | { type: 'text' | 'textarea' | 'date' | 'boolean' }
  | { type: 'number'; min?: number; max?: number; integer?: boolean }
  | { type: 'money' }
  | {
      type: 'select';
      options: readonly string[] | ((v: Values) => readonly string[]);
      /** `true` = vazio grava `null`; `false` = vazio grava `''` (obrigatório). */
      nullable?: boolean;
    }
  | { type: 'multiselect'; options: readonly string[] }
  | {
      type: 'reference';
      module: ModuleId;
      collection: string;
      multiple?: boolean;
      constraint?: string;
      /** Exclui alvos (ex.: o próprio registro). */
      exclude?: (target: Entity, v: Values) => boolean;
    }
);

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** Exemplo de preenchimento — nunca entra em comandos, snapshot, analytics ou exportação. */
export type Example<E> = {
  title: string;
  explanation: string;
  values: Partial<DistributiveOmit<E, 'id' | 'code'>>;
};

export function getPath(obj: Values, path: string): unknown {
  return path.split('.').reduce<unknown>((cur, k) => (cur && typeof cur === 'object' ? (cur as Values)[k] : undefined), obj);
}

export function setPath(obj: Values, path: string, value: unknown): Values {
  const [head, ...rest] = path.split('.');
  if (!head) return obj;
  if (rest.length === 0) return { ...obj, [head]: value };
  const child = (obj[head] && typeof obj[head] === 'object' ? obj[head] : {}) as Values;
  return { ...obj, [head]: setPath(child, rest.join('.'), value) };
}

/** Troca o nome técnico do campo pelo rótulo na mensagem de erro ("lastValidation: …"). */
export function prettifyErrors(errors: string[], fields: FieldDef[]): string[] {
  return errors.map((e) => {
    const f = fields.find((x) => e.startsWith(`${x.key}:`));
    return f ? `${f.label}${e.slice(f.key.length)}` : e;
  });
}
