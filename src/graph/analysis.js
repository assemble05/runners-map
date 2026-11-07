// Graph questions with plain answers: which surfaces hang together, which link is the only way somewhere,
// and the lowest route between two sets of surfaces. Every function takes the graph from buildGraph and an
// optional filter that says which surfaces count, so a level can be looked at on its own. They walk links
// (edges merged by where they leave and land), so a pocket entered and left at one spot counts once.

/** Connected components over the surfaces that pass `keep`. */
export function components(graph, keep = () => true) {
  const seen = new Map();
  let count = 0;
  for (const surface of graph.surfaces) {
    if (!keep(surface) || seen.has(surface.id)) continue;
    const stack = [surface.id];
    seen.set(surface.id, count);
    while (stack.length) {
      const id = stack.pop();
      for (const { to } of graph.adjacency[id]) {
        if (keep(graph.surfaces[to]) && !seen.has(to)) {
          seen.set(to, count);
          stack.push(to);
        }
      }
    }
    count += 1;
  }
  return { count, of: seen };
}

/** Degree of a surface: how many links touch it. */
export function degree(graph, id, keep = () => true) {
  return graph.adjacency[id].filter(({ to }) => keep(graph.surfaces[to])).length;
}

/** Bridges: links whose removal disconnects the graph. */
export function bridges(graph, keep = () => true) {
  const disc = new Map();
  const low = new Map();
  const found = [];
  let time = 0;
  const visit = (start) => {
    const stack = [{ id: start, parentLink: -1, index: 0 }];
    disc.set(start, time);
    low.set(start, time);
    time += 1;
    while (stack.length) {
      const frame = stack[stack.length - 1];
      const neighbours = graph.adjacency[frame.id].filter(({ to }) => keep(graph.surfaces[to]));
      if (frame.index < neighbours.length) {
        const { to, link } = neighbours[frame.index];
        frame.index += 1;
        if (link.id === frame.parentLink) continue;
        if (!disc.has(to)) {
          disc.set(to, time);
          low.set(to, time);
          time += 1;
          stack.push({ id: to, parentLink: link.id, index: 0 });
        } else {
          low.set(frame.id, Math.min(low.get(frame.id), disc.get(to)));
        }
      } else {
        stack.pop();
        if (!stack.length) continue;
        const parent = stack[stack.length - 1];
        low.set(parent.id, Math.min(low.get(parent.id), low.get(frame.id)));
        if (low.get(frame.id) > disc.get(parent.id)) found.push(graph.links[frame.parentLink]);
      }
    }
  };
  for (const surface of graph.surfaces) if (keep(surface) && !disc.has(surface.id)) visit(surface.id);
  return found;
}

/** The route from any `sources` surface to any `targets` surface that stays lowest: Dijkstra where each step
 * costs 1 plus how high the next surface is (0 at the floor of the level, 1 at its ceiling). */
export function lowestRoute(graph, sources, targets, keep, altitude) {
  const dist = new Map();
  const prev = new Map();
  const done = new Set();
  const targetSet = new Set(targets);
  for (const id of sources) dist.set(id, 0);
  while (true) {
    let current = null;
    for (const [id, d] of dist) if (!done.has(id) && (current === null || d < dist.get(current))) current = id;
    if (current === null) return null;
    if (targetSet.has(current)) {
      const path = [current];
      while (prev.has(path[0])) path.unshift(prev.get(path[0]));
      return path;
    }
    done.add(current);
    for (const { to } of graph.adjacency[current]) {
      if (!keep(graph.surfaces[to])) continue;
      const cost = dist.get(current) + 1 + altitude(graph.surfaces[to]);
      if (!dist.has(to) || cost < dist.get(to)) {
        dist.set(to, cost);
        prev.set(to, current);
      }
    }
  }
}
