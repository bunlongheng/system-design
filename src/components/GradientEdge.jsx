import { BaseEdge, EdgeLabelRenderer, getBezierPath, useInternalNode, useReactFlow, Position } from '@xyflow/react'

// ─── Floating edge geometry ─────────────────────────────────────────────────
// Connect each edge at the point on the node border NEAREST the other node, so
// edges always take the shortest, cleanest path instead of wrapping right-to-left.

function getNodeIntersection(node, target) {
  const { width: w, height: h } = node.measured
  const pos = node.internals.positionAbsolute
  const tpos = target.internals.positionAbsolute
  const w2 = w / 2, h2 = h / 2
  const x2 = pos.x + w2, y2 = pos.y + h2
  const x1 = tpos.x + target.measured.width / 2
  const y1 = tpos.y + target.measured.height / 2
  const xx1 = (x1 - x2) / (2 * w2) - (y1 - y2) / (2 * h2)
  const yy1 = (x1 - x2) / (2 * w2) + (y1 - y2) / (2 * h2)
  const a = 1 / (Math.abs(xx1) + Math.abs(yy1) || 1)
  const xx3 = a * xx1, yy3 = a * yy1
  return { x: w2 * (xx3 + yy3) + x2, y: h2 * (-xx3 + yy3) + y2 }
}

function getEdgePosition(node, p) {
  const x = node.internals.positionAbsolute.x
  const y = node.internals.positionAbsolute.y
  const { width: w, height: h } = node.measured
  const px = Math.round(p.x), py = Math.round(p.y)
  if (px <= Math.round(x) + 1) return Position.Left
  if (px >= Math.round(x + w) - 1) return Position.Right
  if (py <= Math.round(y) + 1) return Position.Top
  if (py >= Math.round(y + h) - 1) return Position.Bottom
  return Position.Top
}

// Edge whose line is a gradient from the SOURCE node's color to the TARGET
// node's color, connected at the nearest borders. The label badge sits at the
// midpoint; the Steps chip is a chip inside that badge.
export function GradientEdge({
  id, source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, label,
}) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const { getNodes, getEdges } = useReactFlow()

  let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY, sp = sourcePosition, tp = targetPosition
  if (sourceNode?.measured?.width && targetNode?.measured?.width) {
    const si = getNodeIntersection(sourceNode, targetNode)
    const ti = getNodeIntersection(targetNode, sourceNode)
    sx = si.x; sy = si.y; tx = ti.x; ty = ti.y
    sp = getEdgePosition(sourceNode, si)
    tp = getEdgePosition(targetNode, ti)
  }

  // Parallel edges between the same node pair (e.g. a request + its response loop)
  // otherwise share identical geometry, so their lines AND labels stack. Fan them
  // out: each sibling gets a perpendicular offset (bent line + shifted label).
  const pairKey = [source, target].slice().sort().join('|')
  const siblings = getEdges().filter(e => [e.source, e.target].slice().sort().join('|') === pairKey)
  const parallel = siblings.length > 1

  let path, labelX, labelYRaw
  if (parallel) {
    const n = siblings.length
    const idx = siblings.slice().sort((a, b) => (a.id < b.id ? -1 : 1)).findIndex(e => e.id === id)
    const centered = idx - (n - 1) / 2 // 0-centered rank: -1, 0, +1 ...
    const dx = tx - sx, dy = ty - sy
    const L = Math.hypot(dx, dy) || 1
    // Canonical perpendicular (same vector for both directions) so siblings split
    // to opposite sides instead of collapsing onto each other.
    const flip = source < target ? 1 : -1
    const px = (-dy / L) * flip, py = (dx / L) * flip
    const mx = (sx + tx) / 2, my = (sy + ty) / 2
    // Bow each sibling out into a big arc so a request+response reads as a clear
    // loop, not two cramped near-parallel lines. Bend scales with edge length
    // (capped) so short and long loops both look round.
    const bow = centered * Math.min(150, Math.max(70, L * 0.32))
    const cx = mx + px * bow, cy = my + py * bow
    path = `M${sx},${sy} Q${cx},${cy} ${tx},${ty}`
    // Stagger each sibling's label to a DIFFERENT point along its curve so the
    // labels spread out along the arc instead of stacking on one line.
    const t = Math.min(0.72, Math.max(0.28, 0.5 + centered * 0.16))
    const mt = 1 - t
    labelX = mt * mt * sx + 2 * mt * t * cx + t * t * tx
    labelYRaw = mt * mt * sy + 2 * mt * t * cy + t * t * ty
  } else {
    ;[path, labelX, labelYRaw] = getBezierPath({
      sourceX: sx, sourceY: sy, targetX: tx, targetY: ty, sourcePosition: sp, targetPosition: tp,
    })
  }
  // If the label lands on top of a service node, lift it just above that node so
  // the text never overlaps a box.
  let labelY = labelYRaw
  for (const n of getNodes()) {
    if (n.type !== 'awsNode' || !n.measured) continue
    const { x, y } = n.position
    const w = n.measured.width, h = n.measured.height
    if (labelX > x - 4 && labelX < x + w + 4 && labelYRaw > y - 4 && labelYRaw < y + h + 4) {
      // Push out the NEAREST side (top or bottom) by the minimal amount so the
      // label clears the node while staying as close to the edge as possible.
      labelY = labelYRaw < y + h / 2 ? y - 12 : y + h + 12
      break
    }
  }
  const c1 = data?.sourceColor || '#6b7280'
  const c2 = data?.targetColor || '#6b7280'
  const gid = `grad-${id}`
  const hasStep = data?.step != null

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sx} y1={sy} x2={tx} y2={ty}>
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: `url(#${gid})`, strokeWidth: 1.5 }} />
      {(label || hasStep) && (
        <EdgeLabelRenderer>
          <div
            className="sd-edge-badge"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              '--c1': c1, '--c2': c2,
            }}
          >
            {hasStep && <span className="sd-step-chip">{data.step}</span>}
            {label && <span>{label}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- edgeTypes must live alongside GradientEdge for <ReactFlow edgeTypes={edgeTypes}>
export const edgeTypes = { gradient: GradientEdge }
