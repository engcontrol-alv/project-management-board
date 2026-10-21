import type { ProjectId } from '@/core/ids';
import { err, ok } from '@/core/result';
import type { GovernanceProfile } from '@/modules/governance';
import { rescaleRisk, type RisksSettings } from '@/modules/risks';
import type { IsoDate } from '@/shared/lib/dates';
import { issuesToMessages, ptErrorMap } from '@/shared/lib/zod';
import { defaultConfig, resolveConfig, setModuleEnabled } from '@/project/config';
import { SCHEMA_VERSION } from '@/project/migrations';
import type { Project, ProjectInfo } from '@/project/project';
import { MANIFESTS, type ImplementedModuleId } from '@/project/registry';
import { emptySnapshot, type ProjectSnapshot } from '@/project/snapshot';
import { guard } from './guard';
import type { Command, CommandContext } from './run';

const PROFILE_TABLE = 'governance_profile';

export function newProjectSnapshot(info: ProjectInfo, ctx: CommandContext): ProjectSnapshot {
  const project: Project = {
    id: ctx.newId() as ProjectId,
    schemaVersion: SCHEMA_VERSION,
    info,
    config: defaultConfig(),
    statusDate: null,
    counters: {},
    createdAt: ctx.now,
    updatedAt: ctx.now,
  };
  return emptySnapshot(project);
}

const touch = (p: Project, ctx: CommandContext, patch: Partial<Project> = {}): Project => ({
  ...p,
  ...patch,
  updatedAt: ctx.now,
});

export const updateProjectInfo = (info: ProjectInfo): Command =>
  guard((s, ctx) => ok({ project: touch(s.project, ctx, { info }), puts: [], deletes: [] }));

/** Ficha do projeto: dados básicos + perfil de governança, numa só gravação. */
export const saveCharter = (info: ProjectInfo, profile: GovernanceProfile): Command =>
  guard((s, ctx) =>
    ok({
      project: touch(s.project, ctx, { info }),
      puts: [{ table: PROFILE_TABLE, value: profile }],
      deletes: [],
    }),
  );

export const setStatusDate = (statusDate: IsoDate | null): Command =>
  guard((s, ctx) => ok({ project: touch(s.project, ctx, { statusDate }), puts: [], deletes: [] }));

export const setModuleEnabledCmd = (id: ImplementedModuleId, on: boolean): Command =>
  guard((s, ctx) =>
    ok({
      project: touch(s.project, ctx, { config: setModuleEnabled(s.project.config, id, on) }),
      puts: [],
      deletes: [],
    }),
  );

function phasesInUse(s: ProjectSnapshot): Set<string> {
  const used = [
    ...Object.values(s.scope.wbs).map((n) => n.phase),
    ...Object.values(s.schedule.milestones).map((m) => m.phase),
    s.governance.profile.charter.currentPhase,
  ];
  return new Set(used.filter((p) => p !== ''));
}

export const updateModuleSettings = (id: ImplementedModuleId, settings: unknown): Command =>
  guard((s, ctx) => {
    const parsed = MANIFESTS[id].settingsSchema.safeParse(settings, { errorMap: ptErrorMap });
    if (!parsed.success) return err(issuesToMessages(parsed.error));
    if (id === 'schedule') {
      const phases = new Set((parsed.data as { phases: string[] }).phases);
      const removed = [...phasesInUse(s)].filter((p) => !phases.has(p));
      if (removed.length > 0)
        return err(removed.map((p) => `Fase "${p}" está em uso e não pode ser removida sem reatribuição.`));
    }
    const puts: { table: string; value: { id: string } }[] = [];
    if (id === 'risks') {
      const next = parsed.data as RisksSettings;
      const categories = new Set(next.categories);
      const inUse = new Set(Object.values(s.risks.risks).map((r) => r.category));
      const removed = [...inUse].filter((c) => !categories.has(c));
      if (removed.length > 0)
        return err(removed.map((c) => `Categoria "${c}" está em uso e não pode ser removida.`));
      // Trocar 3×3 ↔ 5×5 converte os riscos avaliados na mesma transação, guardando o original (D1).
      const from = resolveConfig(s.project.config).settings.risks.scale;
      for (const r of Object.values(s.risks.risks)) {
        const converted = rescaleRisk(r, from, next.scale);
        if (converted !== r) puts.push({ table: 'risks_risks', value: converted });
      }
    }
    const current = s.project.config.modules[id];
    const config = {
      modules: { ...s.project.config.modules, [id]: { enabled: current?.enabled ?? true, settings: parsed.data } },
    };
    return ok({ project: touch(s.project, ctx, { config }), puts, deletes: [] });
  });

export const reopenProject = (): Command =>
  guard(
    (s, ctx) => {
      const p = s.governance.profile;
      if (p.charter.status !== 'Encerrado') return err(['O projeto não está encerrado.']);
      const profile: GovernanceProfile = { ...p, charter: { ...p.charter, status: 'Em execução' } };
      return ok({ project: touch(s.project, ctx), puts: [{ table: PROFILE_TABLE, value: profile }], deletes: [] });
    },
    { allowWhenClosed: true },
  );
