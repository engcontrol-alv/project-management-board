import type { FinancesSettings } from '@/modules/finances';
import type { GovernanceSettings } from '@/modules/governance';
import type { ResourcesSettings } from '@/modules/resources';
import type { RisksSettings } from '@/modules/risks';
import type { StakeholdersSettings } from '@/modules/stakeholders';
import type { ScheduleSettings } from '@/modules/schedule';
import type { ProjectConfig } from './project';
import { MANIFESTS, MODULE_ORDER, type ImplementedModuleId } from './registry';

export type ResolvedConfig = {
  enabled: Record<ImplementedModuleId, boolean>;
  settings: {
    governance: GovernanceSettings;
    schedule: ScheduleSettings;
    scope: Record<string, never>;
    finances: FinancesSettings;
    risks: RisksSettings;
    resources: ResourcesSettings;
    stakeholders: StakeholdersSettings;
  };
  warnings: string[];
};

export function defaultConfig(): ProjectConfig {
  return {
    modules: Object.fromEntries(
      MODULE_ORDER.map((id) => [id, { enabled: true, settings: MANIFESTS[id].defaultSettings }]),
    ),
  };
}

/** Liga/desliga respeitando `mandatory` e `requires` nos dois sentidos. Settings inválidos → padrão + aviso. */
export function resolveConfig(config: ProjectConfig): ResolvedConfig {
  const enabled = {} as Record<ImplementedModuleId, boolean>;
  for (const id of MODULE_ORDER)
    enabled[id] = MANIFESTS[id].mandatory || (config.modules[id]?.enabled ?? true);
  // Um módulo cujo requisito está desligado também fica desligado.
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of MODULE_ORDER) {
      const missing = MANIFESTS[id].requires.some((r) => r in enabled && !enabled[r as ImplementedModuleId]);
      if (enabled[id] && missing) {
        enabled[id] = false;
        changed = true;
      }
    }
  }

  const warnings: string[] = [];
  const settings: Record<string, unknown> = {};
  for (const id of MODULE_ORDER) {
    const m = MANIFESTS[id];
    const raw = config.modules[id]?.settings;
    if (raw === undefined) {
      settings[id] = m.defaultSettings;
      continue;
    }
    const parsed = m.settingsSchema.safeParse(raw);
    if (parsed.success) settings[id] = parsed.data;
    else {
      settings[id] = m.defaultSettings;
      warnings.push(`Parâmetros inválidos em ${m.label}: valores padrão restaurados.`);
    }
  }
  return { enabled, settings: settings as ResolvedConfig['settings'], warnings };
}

export function setModuleEnabled(
  config: ProjectConfig,
  id: ImplementedModuleId,
  on: boolean,
): ProjectConfig {
  const modules = { ...config.modules };
  const set = (m: ImplementedModuleId, value: boolean) => {
    if (MANIFESTS[m].mandatory && !value) return;
    modules[m] = { enabled: value, settings: modules[m]?.settings ?? MANIFESTS[m].defaultSettings };
    if (value) MANIFESTS[m].requires.forEach((r) => set(r as ImplementedModuleId, true));
    else
      MODULE_ORDER.filter((d) => (MANIFESTS[d].requires as string[]).includes(m)).forEach((d) =>
        set(d, false),
      );
  };
  set(id, on);
  return { modules };
}

/** Módulos que dependem de `id` (para avisos ao desligar). */
export function dependentsOf(id: ImplementedModuleId): ImplementedModuleId[] {
  return MODULE_ORDER.filter((d) => (MANIFESTS[d].requires as string[]).includes(id));
}
