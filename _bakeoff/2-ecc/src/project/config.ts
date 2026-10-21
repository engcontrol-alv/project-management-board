import type { z } from 'zod';
import type { ModuleId } from '@/core/module-contract';
import { IMPLEMENTED_MODULES, MANIFESTS, type ImplementedModuleId, type Manifests } from './registry';
import type { ProjectConfig } from './project';

export type ResolvedSettings = { [K in ImplementedModuleId]: z.infer<Manifests[K]['settingsSchema']> };

export type ResolvedConfig = {
  enabled: Record<ImplementedModuleId, boolean>;
  settings: ResolvedSettings;
  warnings: string[];
};

export function defaultConfig(): ProjectConfig {
  return {
    modules: Object.fromEntries(
      IMPLEMENTED_MODULES.map((id) => [id, { enabled: true, settings: structuredClone(MANIFESTS[id].defaultSettings) }]),
    ),
  };
}

export function resolveConfig(config: ProjectConfig): ResolvedConfig {
  const warnings: string[] = [];
  const enabled = {} as Record<ImplementedModuleId, boolean>;
  const settings = {} as Record<ImplementedModuleId, unknown>;
  for (const id of IMPLEMENTED_MODULES) {
    const m = MANIFESTS[id];
    const entry = config.modules[id];
    enabled[id] = m.mandatory || (entry?.enabled ?? true);
    if (entry?.settings === undefined) {
      settings[id] = structuredClone(m.defaultSettings);
      continue;
    }
    const parsed = m.settingsSchema.safeParse(entry.settings);
    if (parsed.success) settings[id] = parsed.data;
    else {
      settings[id] = structuredClone(m.defaultSettings);
      warnings.push(`Parâmetros inválidos em ${m.label}; os valores padrão foram restaurados.`);
    }
  }
  for (const id of IMPLEMENTED_MODULES) {
    const requires: readonly ModuleId[] = MANIFESTS[id].requires;
    if (requires.some((r) => (r in enabled ? !enabled[r as ImplementedModuleId] : false))) enabled[id] = false;
  }
  return { enabled, settings: settings as ResolvedSettings, warnings };
}

/** Liga/desliga aplicando `requires` nos dois sentidos; módulo obrigatório fica sempre ligado. */
export function setModuleEnabled(config: ProjectConfig, id: ImplementedModuleId, on: boolean): ProjectConfig {
  const modules = structuredClone(config.modules);
  const set = (mid: ImplementedModuleId, value: boolean) => {
    const current = modules[mid];
    modules[mid] = { enabled: value, settings: current?.settings ?? structuredClone(MANIFESTS[mid].defaultSettings) };
  };
  const visit = (mid: ImplementedModuleId, value: boolean, seen: Set<string>) => {
    if (seen.has(mid)) return;
    seen.add(mid);
    if (!value && MANIFESTS[mid].mandatory) return;
    set(mid, value);
    if (value) {
      for (const r of MANIFESTS[mid].requires as readonly ModuleId[]) {
        if ((IMPLEMENTED_MODULES as readonly string[]).includes(r)) visit(r as ImplementedModuleId, true, seen);
      }
    } else {
      for (const other of IMPLEMENTED_MODULES) {
        if ((MANIFESTS[other].requires as readonly ModuleId[]).includes(mid)) visit(other, false, seen);
      }
    }
  };
  visit(id, on, new Set());
  return { modules };
}
