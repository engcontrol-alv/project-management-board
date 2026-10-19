/** Versão única de dados e do banco. Cada etapa que adiciona coleções incrementa. */
export const SCHEMA_VERSION = 1;

export class UnsupportedVersionError extends Error {
  constructor(public readonly found: number) {
    super(
      `O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados ${found}; suportada até ${SCHEMA_VERSION}).`,
    );
    this.name = 'UnsupportedVersionError';
  }
}

/** Migra o formato de exportação até `SCHEMA_VERSION` (usado na importação e na carga). */
export function migrateExport(raw: unknown): unknown {
  const version =
    raw && typeof raw === 'object' && 'schemaVersion' in raw ? (raw as { schemaVersion: unknown }).schemaVersion : undefined;
  if (typeof version === 'number' && version > SCHEMA_VERSION) throw new UnsupportedVersionError(version);
  // v1 é a primeira versão: nada a migrar.
  return raw;
}
