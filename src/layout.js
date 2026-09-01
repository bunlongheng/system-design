import * as dagre from '@dagrejs/dagre'

// Real node cards are ~150w x ~100h; pad them so dagre leaves room for the
// edge labels that sit BETWEEN nodes. Generous ranksep/nodesep is what stops
// labels from landing on top of a node.
const NODE_W = 190
const NODE_H = 120

// Auto-layout: dagre computes clean, non-overlapping positions. Node data/type
// and edge styling are preserved - only each node's position changes.
export function layoutElements(nodes, edges, { rankdir = 'LR' } = {}) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir,
    ranksep: 320, nodesep: 220, edgesep: 120, marginx: 40, marginy: 40,
    ranker: 'network-simplex', // best rank assignment -> fewest long edges
    acyclicer: 'greedy',       // break feedback loops cleanly so back-edges
                               // don't route around and tangle the whole graph
  })
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach(e => { if (e.source && e.target) g.setEdge(e.source, e.target) })

  dagre.layout(g)

  // Step order = edge order (edge i is step i+1). A node's "arrival" is the first
  // step that reaches it; entry nodes borrow their first outgoing step so they lead.
  // Within each column (same rank/x) we re-slot nodes top-to-bottom by arrival, so
  // a fan-out reads 3,4,5,6... downward instead of dagre's crossing-minimized order.
  const arrival = {}
  edges.forEach((e, i) => { if (e.target != null && arrival[e.target] === undefined) arrival[e.target] = i })
  edges.forEach((e, i) => { if (e.source != null && arrival[e.source] === undefined) arrival[e.source] = i - 0.5 })
  const orderKey = id => (arrival[id] ?? Number.MAX_SAFE_INTEGER)

  const placed = nodes.map(n => ({ n, p: g.node(n.id) })).filter(x => x.p)
  const cols = new Map()
  for (const item of placed) {
    const k = Math.round(item.p.x)
    if (!cols.has(k)) cols.set(k, [])
    cols.get(k).push(item)
  }
  const newY = new Map()
  for (const arr of cols.values()) {
    const slots = arr.map(a => a.p.y).sort((a, b) => a - b) // top -> bottom
    arr.slice().sort((a, b) => orderKey(a.n.id) - orderKey(b.n.id) || a.p.y - b.p.y)
      .forEach((a, i) => newY.set(a.n.id, slots[i]))
  }

  return placed.map(({ n, p }) => ({
    ...n,
    position: { x: p.x - NODE_W / 2, y: (newY.get(n.id) ?? p.y) - NODE_H / 2 },
  }))
}
