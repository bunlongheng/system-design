import { PALETTE } from '../services'

// ─── Minimap for cards ────────────────────────────────────────────────────────

export function DiagramMinimap({ diagram }) {
  const W = 224, H = 112
  const nodeIds = diagram.nodes.map(n => n.id)
  const n = nodeIds.length
  if (!n) return <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#ffffff', borderRadius: 8 }} />

  // Compute positions from diagram data
  const xs = diagram.nodes.map(nd => nd.position.x)
  const ys = diagram.nodes.map(nd => nd.position.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const pad = 20

  const positions = diagram.nodes.map(nd => ([
    pad + ((nd.position.x - minX) / rangeX) * (W - pad * 2),
    pad + ((nd.position.y - minY) / rangeY) * (H - pad * 2),
  ]))

  const posMap = {}
  diagram.nodes.forEach((nd, i) => { posMap[nd.id] = positions[i] })

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
