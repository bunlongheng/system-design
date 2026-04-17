import * as dagre from '@dagrejs/dagre'

// Parse basic Mermaid flowchart syntax:
//   graph LR / graph TD
//   A[Label] -->|edge label| B[Label]
//   A --> B
export function parseMermaid(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)

  const nodeMap = {}  // id -> label
  const edgeList = [] // { source, target, label }

  // Matches: srcId[srcLabel] -->|edgeLabel| tgtId[tgtLabel]
  // All bracket labels and edge labels are optional
  const edgeRe = /^(\w+)(?:\[([^\]]*)\])?\s*-->\s*(?:\|([^|]*)\|)?\s*(\w+)(?:\[([^\]]*)\])?/

  for (const line of lines) {
    if (/^graph\s+/i.test(line)) continue

    const m = edgeRe.exec(line)
    if (m) {
      const [, srcId, srcLabel, edgeLabel, tgtId, tgtLabel] = m
      if (srcLabel) nodeMap[srcId] = srcLabel
      if (tgtLabel) nodeMap[tgtId] = tgtLabel
      if (!nodeMap[srcId]) nodeMap[srcId] = srcId
      if (!nodeMap[tgtId]) nodeMap[tgtId] = tgtId
      edgeList.push({ source: srcId, target: tgtId, label: (edgeLabel || '').trim() })
      continue
    }

    // Standalone node: A[Label]
    const nodeRe = /^(\w+)\[([^\]]+)\]$/
    const nm = nodeRe.exec(line)
    if (nm) nodeMap[nm[1]] = nm[2]
  }

  // Auto-layout with dagre
  const g = new dagre.graphlib.Graph({ directed: true })
  g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60 })
  g.setDefaultEdgeLabel(() => ({}))

  const NODE_W = 140
  const NODE_H = 80

  Object.keys(nodeMap).forEach(id => g.setNode(id, { width: NODE_W, height: NODE_H }))
  edgeList.forEach(({ source, target }) => g.setEdge(source, target))

  dagre.layout(g)

  const nodes = Object.keys(nodeMap).map(id => {
    const { x, y } = g.node(id)
    return {
      id,
      type: 'awsNode',
      position: { x: x - NODE_W / 2, y: y - NODE_H / 2 },
      data: { id, label: nodeMap[id] },
    }
  })

  const edges = edgeList.map((e, i) => ({
    id: `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label || undefined,
    animated: false,
    style: { stroke: '#6b7280', strokeWidth: 1.8 },
    labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
    labelBgPadding: [4, 8],
    labelBgBorderRadius: 6,
  }))

  return { nodes, edges }
}
