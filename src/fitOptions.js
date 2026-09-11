// On a phone, fitting the whole left-to-right graph into 390px lands at zoom
// 0.2 with 2px labels - unreadable on the exact device a shared link is opened
// on. There, centre on the start node at a readable zoom and let the reader
// pan; the desktop keeps the whole-graph fit. Works with or without
// the auto Start marker in the node list.
export const PHONE_MAX_WIDTH = 640

export function fitOptions(nodes, edges, base) {
  if (typeof window === 'undefined' || window.innerWidth > PHONE_MAX_WIDTH) return base
  const marker = nodes.find(n => n.type === 'marker' && n.id.startsWith('__start_'))
  const ids = new Set(nodes.map(n => n.id))
  const incoming = new Set(edges.map(e => e.target))
  const startId = marker
    ? marker.id.slice('__start_'.length)
    : (edges[0]?.source && ids.has(edges[0].source)) ? edges[0].source
    : (nodes.find(n => n.type === 'awsNode' && !incoming.has(n.id)) || nodes.find(n => n.type === 'awsNode'))?.id
  if (!startId) return base
  // Centre on the start node (and its "Start here" pill) at a fixed 0.7: about
  // 3 cards wide on a 390px screen, reading left-to-right from step 1.
  const focus = [startId, `__start_${startId}`].filter(id => ids.has(id))
  return { ...base, nodes: focus.map(id => ({ id })), padding: 0, minZoom: 0.7, maxZoom: 0.7 }
}
