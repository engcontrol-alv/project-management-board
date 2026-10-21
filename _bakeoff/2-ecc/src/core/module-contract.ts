import type { z } from 'zod';

export const MODULE_IDS = [
  'governance',
  'scope',
  'schedule',
  'finances',
  'risks',
  'resources',
  'stakeholders',
] as const;
export type ModuleId = (typeof MODULE_IDS)[number];

export interface RefDef {
  /** Caminho do campo; aceita ponto (`'charter.clientId'`). */
  field: string;
  /** Rótulo do campo usado nas mensagens de integridade (`'responsável'`). */
  label: string;
  target: { module: ModuleId; collection: string };
  many: boolean;
  required: boolean;
  /** Nome de predicado declarado no manifest do ALVO. */
  constraint?: string;
}

export interface CollectionDef<E extends { id: string } = { id: string }> {
  module: ModuleId;
  name: string;
  table: string;
  label: string;
  cardinality: 'many' | 'one';
  schema: z.ZodType<E, z.ZodTypeDef, unknown>;
  codePrefix?: string;
  refs: RefDef[];
  describe(e: E): string;
}

export type Constraint = (target: unknown) => string | null;

export interface ModuleManifest<S extends z.ZodTypeAny = z.ZodTypeAny> {
  id: ModuleId;
  label: string;
  mandatory: boolean;
  requires: ModuleId[];
  settingsSchema: S;
  defaultSettings: z.infer<S>;
  collections: CollectionDef[];
  constraints: Record<string, Constraint>;
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
