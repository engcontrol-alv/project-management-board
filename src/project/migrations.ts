/** Versão única de dados e do banco. Cada etapa que adiciona coleções incrementa. */
export const SCHEMA_VERSION = 2;

export class UnsupportedVersionError extends Error {
  constructor(public readonly found: number) {
    super(
      `O arquivo foi gerado por uma versão mais nova da aplicação (versão de dados ${found}; suportada até ${SCHEMA_VERSION}).`,
    );
    this.name = 'UnsupportedVersionError';
  }
}

/** Tabelas Dexie da v1 (Etapa 1), congeladas: o upgrade do banco parte delas. */
export const STORES_V1: Record<string, string> = {
  core_projects: 'id',
  core_baselines: 'id, projectId',
  stakeholders_parties: 'id, projectId',
  governance_profile: 'id, projectId',
  governance_norms: 'id, projectId',
  governance_meetings: 'id, projectId',
  governance_lessons: 'id, projectId',
  scope_requirements: 'id, projectId',
  scope_wbs: 'id, projectId',
  scope_deliverables: 'id, projectId',
  scope_changeRequests: 'id, projectId',
  schedule_milestones: 'id, projectId',
};

type Row = Record<string, unknown>;
const isRow = (r: unknown): r is Row => !!r && typeof r === 'object' && !Array.isArray(r);

/** Migração de linhas por versão de origem → tabela. Usada pela importação E pelo upgrade do Dexie. */
const ROW_STEPS: Record<number, Record<string, (row: Row) => Row>> = {
  // v1 → v2: análise da parte interessada (D5) começa vazia.
  1: { stakeholders_parties: (p) => ('analysis' in p ? p : { ...p, analysis: null }) },
};

/** Migra as linhas de uma tabela da versão `from` até a atual. Devolve o mesmo array se nada mudar. */
export function migrateRows(table: string, rows: unknown[], from: number): unknown[] {
  let out = rows;
  for (let v = from; v < SCHEMA_VERSION; v++) {
    const step = ROW_STEPS[v]?.[table];
    if (step) out = out.map((r) => (isRow(r) ? step(r) : r));
  }
  return out;
}

/** Parâmetros que mudaram de forma (v1 guardava `{}` para Partes Interessadas). */
function migrateProject(project: unknown, from: number): unknown {
  if (!isRow(project)) return project;
  let p: Row = { ...project, schemaVersion: SCHEMA_VERSION };
  if (from < 2) {
    const config = isRow(p.config) ? p.config : {};
    const modules = isRow(config.modules) ? config.modules : {};
    const st = modules.stakeholders;
    if (isRow(st) && isRow(st.settings) && !('supplierCommittedThresholdCents' in st.settings))
      p = {
        ...p,
        config: {
          ...config,
          modules: { ...modules, stakeholders: { ...st, settings: { supplierCommittedThresholdCents: 10_000_000 } } },
        },
      };
  }
  return p;
}

/** Migra o formato de exportação até `SCHEMA_VERSION` (usado na importação e na carga). */
export function migrateExport(raw: unknown): unknown {
  if (!isRow(raw)) return raw;
  const version = raw.schemaVersion;
  if (typeof version !== 'number') return raw;
  if (version > SCHEMA_VERSION) throw new UnsupportedVersionError(version);
  if (version === SCHEMA_VERSION) return raw;
  const data = isRow(raw.data)
    ? Object.fromEntries(
        Object.entries(raw.data).map(([t, rows]) => [t, Array.isArray(rows) ? migrateRows(t, rows, version) : rows]),
      )
    : raw.data;
  return { ...raw, schemaVersion: SCHEMA_VERSION, project: migrateProject(raw.project, version), data };
}

/** Mesma migração do projeto, para o upgrade do banco. */
export function migrateProjectRow(project: unknown, from: number): unknown {
  return migrateProject(project, from);
}
