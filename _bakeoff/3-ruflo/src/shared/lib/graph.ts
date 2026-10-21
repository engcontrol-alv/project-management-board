/**
 * Busca em profundidade com três cores. Devolve o caminho de um ciclo
 * (ex.: [A, B] para A→B→A) ou `null`. Arestas para nós desconhecidos são ignoradas.
 */
export function findCycleInGraph<Id extends string>(
  ids: Id[],
  edges: (id: Id) => readonly Id[],
): Id[] | null {
  const known = new Set(ids);
  const color = new Map<Id, 'cinza' | 'preto'>();
  const stack: Id[] = [];

  const visit = (id: Id): Id[] | null => {
    color.set(id, 'cinza');
    stack.push(id);
    for (const next of edges(id)) {
      if (!known.has(next)) continue;
      const c = color.get(next);
      if (c === 'cinza') return stack.slice(stack.indexOf(next));
      if (c === undefined) {
        const found = visit(next);
        if (found) return found;
      }
    }
    stack.pop();
    color.set(id, 'preto');
    return null;
  };

  for (const id of ids) {
    if (color.has(id)) continue;
    const found = visit(id);
    if (found) return found;
  }
  return null;
}

/** Ordem topológica (predecessores antes); `null` se houver ciclo. */
export function topologicalOrder<Id extends string>(
  ids: Id[],
  predecessors: (id: Id) => readonly Id[],
): Id[] | null {
  if (findCycleInGraph(ids, predecessors)) return null;
  const known = new Set(ids);
  const done = new Set<Id>();
  const order: Id[] = [];
  const visit = (id: Id) => {
    if (done.has(id)) return;
    done.add(id);
    for (const p of predecessors(id)) if (known.has(p)) visit(p);
    order.push(id);
  };
  ids.forEach(visit);
  return order;
}
