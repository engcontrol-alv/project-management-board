/** DFS em três cores; devolve os nós do primeiro ciclo encontrado ou null. */
export function findCycle<Id extends string>(nodes: Record<Id, { predecessorIds: readonly string[] }>): Id[] | null {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  const stack: string[] = [];

  const visit = (id: string): string[] | null => {
    color.set(id, GRAY);
    stack.push(id);
    for (const pred of nodes[id as Id]?.predecessorIds ?? []) {
      if (!(pred in nodes)) continue;
      const c = color.get(pred) ?? WHITE;
      if (c === GRAY) return stack.slice(stack.indexOf(pred));
      if (c === WHITE) {
        const found = visit(pred);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, BLACK);
    return null;
  };

  for (const id of Object.keys(nodes)) {
    if ((color.get(id) ?? WHITE) !== WHITE) continue;
    const found = visit(id);
    if (found) return found as Id[];
  }
  return null;
}
