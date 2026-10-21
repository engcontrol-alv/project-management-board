import { addDays, diffDays, type IsoDate } from '@/shared/lib/dates';

/** Entrada estrutural do CPM, compatível com o pacote de trabalho da EAP sem importá-lo. */
export type CpmTask<Id extends string = string> = {
  id: Id;
  duration: number;
  predecessorIds: readonly Id[];
  startNoEarlierThan: IsoDate | null;
  actualStart: IsoDate | null;
  actualFinish: IsoDate | null;
  percentComplete: number;
};

export type ScheduleBasis = 'plano' | 'real' | 'reprojetado';

export type ScheduledTask = {
  id: string;
  start: IsoDate;
  finish: IsoDate;
  totalFloat: number;
  critical: boolean;
  basis: ScheduleBasis;
};

export type ScheduleResult<Id extends string = string> =
  | { ok: true; tasks: Record<Id, ScheduledTask>; projectFinish: IsoDate | null }
  | { ok: false; cycle: Id[] };

function topologicalOrder<Id extends string>(tasks: Map<Id, CpmTask<Id>>): Id[] | { cycle: Id[] } {
  const order: Id[] = [];
  const state = new Map<Id, 'visiting' | 'done'>();
  const path: Id[] = [];
  const visit = (id: Id): Id[] | null => {
    state.set(id, 'visiting');
    path.push(id);
    for (const pred of tasks.get(id)!.predecessorIds) {
      if (!tasks.has(pred)) continue;
      const s = state.get(pred);
      if (s === 'visiting') return path.slice(path.indexOf(pred));
      if (!s) {
        const cycle = visit(pred);
        if (cycle) return cycle;
      }
    }
    path.pop();
    state.set(id, 'done');
    order.push(id);
    return null;
  };
  for (const id of tasks.keys()) {
    if (state.has(id)) continue;
    const cycle = visit(id);
    if (cycle) return { cycle };
  }
  return order;
}

/**
 * CPM Término→Início sem lag em dias corridos. Internamente o término é exclusivo
 * (F = ES + duração); a exibição é inclusiva.
 */
export function computeSchedule<Id extends string>(
  list: CpmTask<Id>[],
  projectStart: IsoDate,
  statusDate: IsoDate,
): ScheduleResult<Id> {
  const tasks = new Map(list.map((t) => [t.id, t]));
  const order = topologicalOrder(tasks);
  if (!Array.isArray(order)) return { ok: false, cycle: order.cycle };
  if (!order.length) return { ok: true, tasks: {} as Record<Id, ScheduledTask>, projectFinish: null };

  const idx = (d: IsoDate) => diffDays(projectStart, d);
  const status = idx(statusDate);
  const es = new Map<Id, number>();
  const ef = new Map<Id, number>();
  const basis = new Map<Id, ScheduleBasis>();
  const preds = (t: CpmTask<Id>) => t.predecessorIds.filter((p) => tasks.has(p));

  for (const id of order) {
    const t = tasks.get(id)!;
    let start = Math.max(0, t.startNoEarlierThan ? idx(t.startNoEarlierThan) : 0, ...preds(t).map((p) => ef.get(p)!));
    let b: ScheduleBasis = 'plano';
    if (t.actualStart) {
      start = idx(t.actualStart);
      b = 'real';
    } else if (start < status) {
      start = status;
      b = 'reprojetado';
    }
    let finish = start + t.duration;
    if (t.actualFinish) {
      finish = idx(t.actualFinish) + 1;
    } else if (t.actualStart && finish <= status) {
      finish = status + Math.ceil(t.duration * (1 - t.percentComplete / 100));
      b = 'reprojetado';
    }
    es.set(id, start);
    ef.set(id, finish);
    basis.set(id, b);
  }

  const projectEnd = Math.max(...ef.values());
  const successors = new Map<Id, Id[]>(order.map((id) => [id, []]));
  for (const id of order) for (const p of preds(tasks.get(id)!)) successors.get(p)!.push(id);

  const ls = new Map<Id, number>();
  const lf = new Map<Id, number>();
  for (const id of [...order].reverse()) {
    const succ = successors.get(id)!;
    const late = succ.length ? Math.min(...succ.map((s) => ls.get(s)!)) : projectEnd;
    lf.set(id, late);
    ls.set(id, late - (ef.get(id)! - es.get(id)!));
  }

  const out = {} as Record<Id, ScheduledTask>;
  let finishMax: IsoDate | null = null;
  for (const id of order) {
    const start = es.get(id)!;
    const finish = ef.get(id)!;
    const totalFloat = lf.get(id)! - finish;
    const startDate = addDays(projectStart, start);
    const finishDate = finish === start ? startDate : addDays(projectStart, finish - 1);
    out[id] = { id, start: startDate, finish: finishDate, totalFloat, critical: totalFloat === 0, basis: basis.get(id)! };
    if (!finishMax || finishDate > finishMax) finishMax = finishDate;
  }
  return { ok: true, tasks: out, projectFinish: finishMax };
}

export type RollupNode = {
  id: string;
  parentId: string | null;
  kind: 'Agrupador' | 'Pacote de trabalho';
  duration: number;
  percentComplete: number;
};

export type GroupRollup = { start: IsoDate | null; finish: IsoDate | null; percent: number | null };

/** Datas e % dos agrupadores a partir dos pacotes descendentes. */
export function rollupGroups(nodes: RollupNode[], result: ScheduleResult): Record<string, GroupRollup> {
  const children = new Map<string, RollupNode[]>();
  for (const n of nodes) {
    if (!n.parentId) continue;
    children.set(n.parentId, [...(children.get(n.parentId) ?? []), n]);
  }
  const packagesOf = (id: string, seen = new Set<string>()): RollupNode[] => {
    if (seen.has(id)) return [];
    seen.add(id);
    return (children.get(id) ?? []).flatMap((c) => (c.kind === 'Agrupador' ? packagesOf(c.id, seen) : [c]));
  };

  const out: Record<string, GroupRollup> = {};
  for (const g of nodes.filter((n) => n.kind === 'Agrupador')) {
    const pkgs = packagesOf(g.id);
    const scheduled = result.ok ? pkgs.map((p) => result.tasks[p.id]).filter((t) => t !== undefined) : [];
    const weight = pkgs.reduce((s, p) => s + p.duration, 0);
    out[g.id] = {
      start: scheduled.length ? scheduled.map((t) => t.start).reduce((a, b) => (b < a ? b : a)) : null,
      finish: scheduled.length ? scheduled.map((t) => t.finish).reduce((a, b) => (b > a ? b : a)) : null,
      percent: weight ? pkgs.reduce((s, p) => s + p.duration * p.percentComplete, 0) / weight : null,
    };
  }
  return out;
}
