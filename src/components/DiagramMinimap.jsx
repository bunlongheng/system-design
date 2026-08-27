import { findService } from '../services'
import { layoutElements } from '../layout'

// ─── Minimap for cards ────────────────────────────────────────────────────────

export function DiagramMinimap({ diagram }) {
  const W = 224, H = 112
  // Some diagrams (created via the API without coordinates) have nodes with no
  // position. Fall back to a simple grid so a single such diagram can never
  // crash the whole gallery.
  // Lay out with dagre so the card preview matches the real (detail) diagram,
  // not the raw stored grid positions.
  const rawNodes = (diagram.nodes || []).map(nd => ({ id: nd.id }))
  const nds = rawNodes.length ? layoutElements(rawNodes, diagram.edges || []) : []
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

  const R = 11 // node tile half-size
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', background: '#ffffff', borderRadius: 8 }}>
      {diagram.edges.map((e, i) => {
        const fp = posMap[e.source], tp = posMap[e.target]
        if (!fp || !tp) return null
        const color = findService({ id: e.source })?.color || '#cbd5e1'
        return <line key={`e${i}`} x1={fp[0]} y1={fp[1]} x2={tp[0]} y2={tp[1]} stroke={color} strokeOpacity={0.5} strokeWidth={1.4} />
      })}
      {nds.map((nd, i) => {
        const [x, y] = positions[i]
        const svc = findService({ id: nd.id })
        const color = svc.color || '#94a3b8'
        return (
          <g key={`n${i}`}>
            <rect x={x - R} y={y - R} width={R * 2} height={R * 2} rx={5} fill="#ffffff" stroke={color} strokeWidth={1.3} />
            {svc.icon
              ? <image href={svc.icon} x={x - 7} y={y - 7} width={14} height={14} preserveAspectRatio="xMidYMid meet" />
              : <circle cx={x} cy={y} r={4} fill={color} />}
          </g>
        )
      })}
    </svg>
  )
}
