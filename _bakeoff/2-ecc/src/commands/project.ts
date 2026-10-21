import type { ProjectId } from '@/core/ids';
import { err, ok, type Result } from '@/core/result';
import type { IsoDate } from '@/shared/lib/dates';
import { zodMessages } from '@/shared/lib/zod';
import { defaultConfig, setModuleEnabled } from '@/project/config';
import { SCHEMA_VERSION } from '@/project/migrations';
import { projectInfoSchema, type Project, type ProjectInfo } from '@/project/project';
import { MANIFESTS, type ImplementedModuleId } from '@/project/registry';
import type { GovernanceProfile } from '@/modules/governance';
import { emptySnapshot, type ProjectSnapshot } from '@/project/snapshot';
import { guard } from './guard';
import type { Command, CommandContext } from './run';

export function newProjectSnapshot(info: ProjectInfo, ctx: CommandContext): Result<ProjectSnapshot, string[]> {
  const parsed = projectInfoSchema.safeParse(info);
  if (!parsed.success) return err(zodMessages(parsed.error));
  const project: Project = {
    id: ctx.newId() as ProjectId,
    schemaVersion: SCHEMA_VERSION,
    info: parsed.data,
    config: defaultConfig(),
    statusDate: null,
    counters: {},
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return ok(emptySnapshot(project));
}

function projectCommand(change: (p: Project) => Partial<Project> | string[]): Command {
  return guard((s, ctx) => {
    const patch = change(s.project);
    if (Array.isArray(patch)) return err(patch);
    return ok({ project: { ...s.project, ...patch, updatedAt: ctx.now }, puts: [], deletes: [] });
  });
}

export const updateProjectInfo = (info: ProjectInfo): Command => projectCommand(() => ({ info }));

export const setStatusDate = (statusDate: IsoDate | null): Command => projectCommand(() => ({ statusDate }));

export const setModuleEnabledCmd = (id: ImplementedModuleId, on: boolean): Command =>
  projectCommand((p) => ({ config: setModuleEnabled(p.config, id, on) }));

export const updateModuleSettings = (id: ImplementedModuleId, settings: unknown): Command =>
  projectCommand((p) => {
    const parsed = MANIFESTS[id].settingsSchema.safeParse(settings);
    if (!parsed.success) return zodMessages(parsed.error);
    const current = p.config.modules[id];
    return {
      config: { modules: { ...p.config.modules, [id]: { enabled: current?.enabled ?? true, settings: parsed.data } } },
    };
  });

export const reopenProject = (): Command =>
  guard(
    (s) => {
      const profile = s.governance.profile;
      return ok({
        puts: [{ table: 'governance_profile', value: { ...profile, charter: { ...profile.charter, status: 'Em execução' } } }],
        deletes: [],
      });
    },
    { allowWhenClosed: true },
  );

/** Ficha do projeto: informações do projeto e perfil de governança gravados juntos. */
export const saveCharter = (info: ProjectInfo, profile: GovernanceProfile): Command =>
  guard((s, ctx) =>
    ok({
      project: { ...s.project, info, updatedAt: ctx.now },
      puts: [{ table: 'governance_profile', value: profile }],
      deletes: [],
    }),
  );
