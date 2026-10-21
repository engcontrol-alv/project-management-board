import { addDays, diffDays, type IsoDate } from '@/shared/lib/dates';
import { findCycleInGraph, topologicalOrder } from '@/shared/lib/graph';

/** Entrada do CPM — estruturalmente compatível com o pacote de trabalho da EAP. */
export type CpmTask<Id extends string = string> = {
  id: Id;
  duration: number;
  predecessorIds: readonly Id[];
  startNoEarlierThan: IsoDate | null;
  actualStart: IsoDate | null;
  actualFinish: IsoDate | null;
  percentComplete: number;
};

export type ScheduledTask = {
  id: string;
  start: IsoDate;
  /** Término inclusivo; duração 0 → término = início. */
  finish: IsoDate;
  totalFloat: number;
  critical: boolean;
  basis: 'plano' | 'real' | 'reprojetado';
};

export type ScheduleResult<Id extends string = string> =
  | { ok: true; tasks: Record<Id, ScheduledTask>; projectFinish: IsoDate | null }
  | { ok: false; cycle: Id[] };

/**
 * Caminho crítico Término→Início, sem lag, em dias corridos (SPEC §8.1).
 * Internamente os dias são índices relativos a `projectStart` e o término é exclusivo.
 */
export function computeSchedule<Id extends string>(
  tasks: CpmTask<Id>[],
  projectStart: IsoDate,
  statusDate: IsoDate,
): ScheduleResult<Id> {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const ids = tasks.map((t) => t.id);
  const preds = (id: Id) => (byId.get(id)?.predecessorIds ?? []).filter((p) => byId.has(p));

  const cycle = findCycleInGraph(ids, preds);
  if (cycle) return { ok: false, cycle };
  const order = topologicalOrder(ids, preds) ?? [];

  const idx = (d: IsoDate) => diffDays(projectStart, d);
  const statusIdx = idx(statusDate);
  const es = new Map<Id, number>();
  const ef = new Map<Id, number>();
  const basis = new Map<Id, ScheduledTask['basis']>();

  for (const id of order) {
    const t = byId.get(id)!;
    let start = 0;
    if (t.startNoEarlierThan) start = Math.max(start, idx(t.startNoEarlierThan));
    for (const p of preds(id)) start = Math.max(start, ef.get(p) ?? 0);
    let b: ScheduledTask['basis'] = 'plano';
    if (t.actualStart) {
      start = idx(t.actualStart);
      b = 'real';
    } else if (start < statusIdx) {
      start = statusIdx;
      b = 'reprojetado';
    }
    let finish = start + t.duration;
    if (t.actualFinish) {
      finish = idx(t.actualFinish) + 1;
      b = 'real';
    } else if (t.actualStart && finish <= statusIdx) {
      finish = statusIdx + Math.ceil((t.duration * (100 - t.percentComplete)) / 100);
      b = 'reprojetado';
    }
    es.set(id, start);
    ef.set(id, finish);
    basis.set(id, b);
  }

  if (order.length === 0) return { ok: true, tasks: {} as Record<Id, ScheduledTask>, projectFinish: null };

  const projectEnd = Math.max(...order.map((id) => ef.get(id)!));
  const successors = new Map<Id, Id[]>(ids.map((id) => [id, []]));
  for (const id of ids) for (const p of preds(id)) successors.get(p)!.push(id);

  const ls = new Map<Id, number>();
  const out = {} as Record<Id, ScheduledTask>;
  let finishIdx = -Infinity;
  for (const id of [...order].reverse()) {
    const start = es.get(id)!;
    const finish = ef.get(id)!;
    const succ = successors.get(id)!;
    const lateFinish = succ.length ? Math.min(...succ.map((s) => ls.get(s)!)) : projectEnd;
    ls.set(id, lateFinish - (finish - start));
    const totalFloat = lateFinish - finish;
    const displayFinish = finish === start ? start : finish - 1;
    finishIdx = Math.max(finishIdx, displayFinish);
    out[id] = {
      id,
      start: addDays(projectStart, start),
      finish: addDays(projectStart, displayFinish),
      totalFloat,
      critical: totalFloat === 0,
      basis: basis.get(id)!,
    };
  }
  return { ok: true, tasks: out, projectFinish: addDays(projectStart, finishIdx) };
}

export type RollupNode = {
  id: string;
  parentId: string | null;
  kind: 'Agrupador' | 'Pacote de trabalho';
  duration: number;
  percentComplete: number;
};

export type GroupRollup = { start: IsoDate | null; finish: IsoDate | null; percent: number | null };

/** Datas e % dos agrupadores a partir dos pacotes descendentes (% ponderado pela duração). */
export function rollupGroups(
  nodes: RollupNode[],
  result: ScheduleResult,
): Record<string, GroupRollup> {
  const children = new Map<string, RollupNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  }
  const descendants = (id: string, seen = new Set<string>()): RollupNode[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    return (children.get(id) ?? []).flatMap((c) =>
      c.kind === 'Pacote de trabalho' ? [c] : descendants(c.id, seen),
    );
  };

  const out: Record<string, GroupRollup> = {};
  for (const g of nodes.filter((n) => n.kind === 'Agrupador')) {
    const pkgs = descendants(g.id);
    const scheduled = result.ok ? pkgs.map((p) => result.tasks[p.id]).filter((t) => t !== undefined) : [];
    const weight = pkgs.reduce((s, p) => s + p.duration, 0);
    out[g.id] = {
      start: scheduled.length ? scheduled.map((t) => t.start).sort()[0]! : null,
      finish: scheduled.length ? scheduled.map((t) => t.finish).sort().at(-1)! : null,
      percent:
        weight > 0 ? pkgs.reduce((s, p) => s + p.duration * p.percentComplete, 0) / weight : null,
    };
  }
  return out;
}
