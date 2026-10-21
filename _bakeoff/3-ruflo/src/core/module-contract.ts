import type { z } from 'zod';

export type ModuleId =
  | 'governance'
  | 'scope'
  | 'schedule'
  | 'finances'
  | 'risks'
  | 'resources'
  | 'stakeholders';

export interface RefDef {
  /** Caminho do campo; aceita ponto (`'charter.clientId'`). */
  field: string;
  /** Rótulo usado nas mensagens de integridade ("responsável"). */
  label: string;
  target: { module: ModuleId; collection: string };
  many: boolean;
  required: boolean;
  /** Nome de um predicado declarado em `constraints` do manifest do módulo-alvo. */
  constraint?: string;
}

export type Entity = { id: string };

export interface CollectionDef<E extends Entity = Entity> {
  module: ModuleId;
  name: string;
  /** `${module}_${name}` — tabela Dexie. */
  table: string;
  /** Nome da coleção para pessoas ("Requisitos"). */
  label: string;
  /** `'one'` = registro único por projeto (id = projectId). */
  cardinality: 'many' | 'one';
  schema: z.ZodType<E, z.ZodTypeDef, unknown>;
  codePrefix?: string;
  refs: RefDef[];
  describe(e: E): string;
}

export interface ModuleManifest<S extends z.ZodTypeAny = z.ZodTypeAny> {
  id: ModuleId;
  label: string;
  mandatory: boolean;
  requires: ModuleId[];
  settingsSchema: S;
  defaultSettings: z.infer<S>;
  collections: CollectionDef[];
  /** Predicados sobre registros DESTE módulo; `null` = ok, texto = motivo. */
  constraints: Record<string, (target: unknown) => string | null>;
}

/** Lê um campo por caminho com ponto. */
export function readPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const key of path.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}
