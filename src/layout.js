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
    ranksep: 190, nodesep: 110, edgesep: 50, marginx: 40, marginy: 40,
    ranker: 'network-simplex', // best rank assignment -> fewest long edges
    acyclicer: 'greedy',       // break feedback loops cleanly so back-edges
                               // don't route around and tangle the whole graph
  })
  g.setDefaultEdgeLabel(() => ({}))

  nodes.forEach(n => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach(e => { if (e.source && e.target) g.setEdge(e.source, e.target) })

  dagre.layout(g)

  return nodes.map(n => {
    const p = g.node(n.id)
    if (!p) return n
    return { ...n, position: { x: p.x - NODE_W / 2, y: p.y - NODE_H / 2 } }
  })
}
