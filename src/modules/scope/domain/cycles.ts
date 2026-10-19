import type { WorkPackageId } from '@/core/ids';
import { findCycleInGraph } from '@/shared/lib/graph';
import type { WbsNode } from '../model/wbs';

/** Ciclo de predecessores na EAP (ids na ordem do ciclo) ou `null`. */
export function findCycle(
  nodes: Record<WorkPackageId, Pick<WbsNode, 'id' | 'predecessorIds'>>,
): WorkPackageId[] | null {
  const ids = Object.keys(nodes) as WorkPackageId[];
  return findCycleInGraph(ids, (id) => nodes[id]?.predecessorIds ?? []);
}
