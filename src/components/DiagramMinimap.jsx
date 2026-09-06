import { findService } from '../services'
import { layoutElements } from '../layout'

// ─── Minimap for cards ────────────────────────────────────────────────────────

export function DiagramMinimap({ diagram }) {
  const W = 224, H = 112
  // The preview has to be the SAME layout the canvas will show, or the card is a
  // false advertisement for what you get on open. So it follows exactly what the
  // detail view does: use the saved positions when every node has one, and only
  // fall back to dagre for diagrams created without coordinates.
  // Keep each node's custom brand fields (icon/label/color/sub) so bring-your-own
  // logos show in the preview too, not just catalog services.
  const raw = diagram.nodes || []
  const rawNodes = raw.map(nd => ({ id: nd.id, icon: nd.icon, label: nd.label, color: nd.color, sub: nd.sub }))
  const byNodeId = Object.fromEntries(rawNodes.map(nd => [nd.id, nd]))
  const hasSaved = raw.length > 0 && raw.every(nd => nd.position && Number.isFinite(nd.position.x) && Number.isFinite(nd.position.y))
  const nds = !rawNodes.length
    ? []
    : hasSaved
      ? rawNodes.map((nd, i) => ({ ...nd, position: { ...raw[i].position } }))
      : layoutElements(rawNodes, diagram.edges || [])
  const n = nds.length
  if (!n) return <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', background: '#ffffff', borderRadius: 8 }} />

  // Compute positions from diagram data
  const xs = nds.map(nd => nd.position.x)
  const ys = nds.map(nd => nd.position.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const rangeX = maxX - minX || 1, rangeY = maxY - minY || 1
  const pad = 20

  // Uniform scale (same factor on both axes) + center. Scaling X and Y
  // independently distorted dagre's spacing and jammed dense diagrams (Claude
  // Code, Zapier) into overlapping tiles; a single scale preserves the real
  // layout so nodes keep their breathing room.
  const scale = Math.min((W - pad * 2) / rangeX, (H - pad * 2) / rangeY)
  const offX = (W - rangeX * scale) / 2, offY = (H - rangeY * scale) / 2
  const positions = nds.map(nd => ([
    offX + (nd.position.x - minX) * scale,
    offY + (nd.position.y - minY) * scale,
  ]))

  const posMap = {}
  nds.forEach((nd, i) => { posMap[nd.id] = positions[i] })

  // Size the tile to the tightest gap so tiles never overlap, even when a
  // diagram is dense; sparse diagrams still get the full-size tile.
  let minD = Infinity
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      minD = Math.min(minD, Math.hypot(positions[i][0] - positions[j][0], positions[i][1] - positions[j][1]))
    }
  }
  const R = Math.max(4.5, Math.min(11, minD / 2 - 1)) // node tile half-size
  const ic = R * 1.35 // icon size
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', background: '#ffffff', borderRadius: 8 }}>
      {diagram.edges.map((e, i) => {
        const fp = posMap[e.source], tp = posMap[e.target]
        if (!fp || !tp) return null
        const color = findService(byNodeId[e.source] || { id: e.source })?.color || '#cbd5e1'
        return <line key={`e${i}`} x1={fp[0]} y1={fp[1]} x2={tp[0]} y2={tp[1]} stroke={color} strokeOpacity={0.5} strokeWidth={1.4} />
      })}
      {nds.map((nd, i) => {
        const [x, y] = positions[i]
        const svc = findService(byNodeId[nd.id] || { id: nd.id })
        const color = svc.color || '#94a3b8'
        return (
          <g key={`n${i}`}>
            <rect x={x - R} y={y - R} width={R * 2} height={R * 2} fill="#ffffff" stroke={color} strokeWidth={0.7} />
            {svc.icon
              ? <image href={svc.icon} x={x - ic / 2} y={y - ic / 2} width={ic} height={ic} preserveAspectRatio="xMidYMid meet" />
              : <circle cx={x} cy={y} r={R * 0.4} fill={color} />}
          </g>
        )
      })}
    </svg>
  )
}
