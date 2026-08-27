import { PALETTE } from '../services'

// ─── Minimap for cards ────────────────────────────────────────────────────────

export function DiagramMinimap({ diagram }) {
  const W = 224, H = 112
  // Some diagrams (created via the API without coordinates) have nodes with no
  // position. Fall back to a simple grid so a single such diagram can never
  // crash the whole gallery.
  const nds = (diagram.nodes || []).map((nd, i) => ({
    id: nd.id,
    position: nd.position && typeof nd.position.x === 'number' && typeof nd.position.y === 'number'
      ? nd.position
      : { x: (i % 6) * 100, y: Math.floor(i / 6) * 100 },
  }))
  const n = nds.length
  if (!n) return <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#ffffff', borderRadius: 8 }} />

  // Compute positions from diagram data
  const xs = nds.map(nd => nd.position.x)
  const ys = nds.map(nd => nd.position.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const pad = 20

  const positions = nds.map(nd => ([
    pad + ((nd.position.x - minX) / rangeX) * (W - pad * 2),
    pad + ((nd.position.y - minY) / rangeY) * (H - pad * 2),
  ]))

  const posMap = {}
  nds.forEach((nd, i) => { posMap[nd.id] = positions[i] })

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', background: '#ffffff', borderRadius: 8 }}>
      {diagram.edges.map((e, i) => {
        const fp = posMap[e.source], tp = posMap[e.target]
        if (!fp || !tp) return null
        return <line key={`e${i}`} x1={fp[0]} y1={fp[1]} x2={tp[0]} y2={tp[1]} stroke="#d1d5db" strokeWidth={1.5} />
      })}
      {positions.map(([x, y], i) => (
        <rect key={`n${i}`} x={x - 14} y={y - 8} width={28} height={16} rx={4} fill={PALETTE[i % PALETTE.length]} />
      ))}
    </svg>
  )
}
