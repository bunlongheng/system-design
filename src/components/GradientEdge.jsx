import { BaseEdge, EdgeLabelRenderer, useInternalNode, useReactFlow } from '@xyflow/react'

// ─── Brace edge geometry ──────────────────────────────────────────────────────
// Every edge LEAVING a node departs from one shared point on that node's border,
// and every edge ARRIVING at a node lands on one shared point. Fan-outs then read
// as a brace - one stem splitting into branches - instead of a spray of lines
// touching a box at five different places.
//
// The shared point is the border crossing in the AVERAGE direction of that node's
// partners, so a node feeding things to its right anchors on its right edge, and
// one feeding upward anchors on top. It falls out of the graph, nothing is hard
// coded to left-to-right.

// Two boxes that sit on the same axis get a straight connector instead of a
// brace curve - lining them up was a deliberate act and the diagram should show
// it. "On the same axis" is proportional: the off-axis drift has to be within 5%
// of how far apart they are, so a long run tolerates a few pixels of slop while
// two boxes close together have to be genuinely square. ALIGN_TOL is the floor,
// so a pair snapped exactly always reads straight even when they nearly touch.
const ALIGN_TOL = 8
const ALIGN_RATIO = 0.05

const onAxis = (drift, span) => drift <= ALIGN_TOL || drift <= span * ALIGN_RATIO

const centerOf = n => ({
  x: n.internals.positionAbsolute.x + n.measured.width / 2,
  y: n.internals.positionAbsolute.y + n.measured.height / 2,
})

// Where the ray leaving the node center in direction (dx, dy) crosses the border.
function borderPoint(node, dx, dy) {
  const c = centerOf(node)
  const w2 = node.measured.width / 2
  const h2 = node.measured.height / 2
  const ax = Math.abs(dx), ay = Math.abs(dy)
  if (!ax && !ay) return { ...c, ux: 1, uy: 0 }
  // Scale the ray until it touches whichever side it reaches first.
  const t = Math.min(ax ? w2 / ax : Infinity, ay ? h2 / ay : Infinity)
  const len = Math.hypot(dx, dy) || 1
  return { x: c.x + dx * t, y: c.y + dy * t, ux: dx / len, uy: dy / len }
}

// The direction a node's stem points: the average heading to everything it talks
// to on that side. `pick` pulls the far end of each edge.
function stemDirection(node, edges, nodeOf, pick) {
  const c = centerOf(node)
  let dx = 0, dy = 0
  for (const e of edges) {
    const other = nodeOf(pick(e))
    if (!other?.measured?.width) continue
    const oc = centerOf(other)
    const vx = oc.x - c.x, vy = oc.y - c.y
    const l = Math.hypot(vx, vy) || 1
    dx += vx / l; dy += vy / l
  }
  return { dx, dy }
}

// Point on a cubic bezier at t - used for the label and the step marker so both
// sit ON the drawn curve rather than near it.
function bezierAt(t, x0, y0, x1, y1, x2, y2, x3, y3) {
  const u = 1 - t
  const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t
  return { x: a * x0 + b * x1 + c * x2 + d * x3, y: a * y0 + b * y1 + c * y2 + d * y3 }
}

// Edge whose line is a gradient from the SOURCE node's color to the TARGET
// node's color, connected at the nearest borders. The label badge sits at the
// midpoint; the Steps chip is a chip inside that badge.
export function GradientEdge({
  id, source, target, sourceX, sourceY, targetX, targetY, markerEnd, data, label,
}) {
  const sourceNode = useInternalNode(source)
  const targetNode = useInternalNode(target)
  const { getNodes, getEdges } = useReactFlow()
  // Stem direction needs the OTHER nodes' geometry, and useInternalNode only
  // covers this edge's two ends, so measured sizes come off the node list.
  const internalById = id => {
    const n = getNodes().find(x => x.id === id)
    return n?.measured?.width
      ? { measured: n.measured, internals: { positionAbsolute: n.position } }
      : null
  }

  const allEdges = getEdges()
  let sx = sourceX, sy = sourceY, tx = targetX, ty = targetY
  let sux = 1, suy = 0, tux = -1, tuy = 0
  let aligned = false
  if (sourceNode?.measured?.width && targetNode?.measured?.width) {
    const nodeOf = idOf => (idOf === source ? sourceNode : idOf === target ? targetNode : internalById(idOf))
    const out = allEdges.filter(e => e.source === source)
    const inc = allEdges.filter(e => e.target === target)
    let sd = stemDirection(sourceNode, out, nodeOf, e => e.target)
    let td = stemDirection(targetNode, inc, nodeOf, e => e.source)
    // A node whose partners cancel out (one left, one right) has no meaningful
    // average - fall back to pointing straight at the other end of this edge.
    const sc = centerOf(sourceNode), tc = centerOf(targetNode)
    if (Math.hypot(sd.dx, sd.dy) < 0.15) sd = { dx: tc.x - sc.x, dy: tc.y - sc.y }
    if (Math.hypot(td.dx, td.dy) < 0.15) td = { dx: sc.x - tc.x, dy: sc.y - tc.y }
    // Aligned pairs bypass the stem averaging entirely - the connector runs flat
    // along the shared axis from one facing edge to the other.
    const driftY = Math.abs(sc.y - tc.y)
    const driftX = Math.abs(sc.x - tc.x)
    if (driftX >= driftY && onAxis(driftY, driftX)) {
      aligned = true
      const y = (sc.y + tc.y) / 2
      const dir = tc.x > sc.x ? 1 : -1
      sx = sc.x + dir * sourceNode.measured.width / 2; sy = y
      tx = tc.x - dir * targetNode.measured.width / 2; ty = y
    } else if (onAxis(driftX, driftY)) {
      aligned = true
      const x = (sc.x + tc.x) / 2
      const dir = tc.y > sc.y ? 1 : -1
      sx = x; sy = sc.y + dir * sourceNode.measured.height / 2
      tx = x; ty = tc.y - dir * targetNode.measured.height / 2
    } else {
      const sp2 = borderPoint(sourceNode, sd.dx, sd.dy)
      const tp2 = borderPoint(targetNode, td.dx, td.dy)
      sx = sp2.x; sy = sp2.y; sux = sp2.ux; suy = sp2.uy
      tx = tp2.x; ty = tp2.y; tux = tp2.ux; tuy = tp2.uy
    }
  }

  // Parallel edges between the same node pair (e.g. a request + its response loop)
  // otherwise share identical geometry, so their lines AND labels stack. Fan them
  // out: each sibling gets a perpendicular offset (bent line + shifted label).
  const pairKey = [source, target].slice().sort().join('|')
  const siblings = getEdges().filter(e => [e.source, e.target].slice().sort().join('|') === pairKey)
  const parallel = siblings.length > 1

  let path, labelX, labelYRaw
  let c1x, c1y, c2x, c2y, cubic = false
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
  } else if (aligned) {
    // Lined up: straight line, edge to facing edge.
    path = `M${sx},${sy} L${tx},${ty}`
    labelX = (sx + tx) / 2
    labelYRaw = (sy + ty) / 2
  } else {
    // Leave along the source's stem, arrive along the target's, so branches peel
    // off one shared stem and settle flat into the box - the mind-map brace.
    const L = Math.hypot(tx - sx, ty - sy) || 1
    const k = Math.min(180, Math.max(40, L * 0.45))
    c1x = sx + sux * k; c1y = sy + suy * k
    c2x = tx + tux * k; c2y = ty + tuy * k
    path = `M${sx},${sy} C${c1x},${c1y} ${c2x},${c2y} ${tx},${ty}`
    const m = bezierAt(0.5, sx, sy, c1x, c1y, c2x, c2y, tx, ty)
    labelX = m.x
    labelYRaw = m.y
    cubic = true
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
      {hasStep && (() => {
        // The step number rides ON the line just short of the target, the way a
        // mind map numbers its branches - not crammed inside the label pill.
        // Everything arriving at one node shares an anchor, so markers placed at
        // the same fraction would pile up there. Stagger them back along their
        // own curves by arrival order.
        const arriving = allEdges.filter(e => e.target === target)
        const rank = arriving.findIndex(e => e.id === id)
        const t = Math.max(0.62, 0.9 - Math.max(0, rank) * 0.07)
        const p = cubic
          ? bezierAt(t, sx, sy, c1x, c1y, c2x, c2y, tx, ty)
          : { x: sx + (tx - sx) * t, y: sy + (ty - sy) * t }
        return (
          <g className="sd-step-dot" pointerEvents="none">
            <circle cx={p.x} cy={p.y} r={6.5} fill="#fff" stroke={c2} strokeWidth={1.5} />
            <text x={p.x} y={p.y} fill={c2} fontSize={7.5} fontWeight={800}
              textAnchor="middle" dominantBaseline="central">{data.step}</text>
          </g>
        )
      })()}
      {label && (
        <EdgeLabelRenderer>
          <div
            className="sd-edge-badge"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              '--c1': c1, '--c2': c2,
            }}
          >
            {label && <span>{label}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- edgeTypes must live alongside GradientEdge for <ReactFlow edgeTypes={edgeTypes}>
export const edgeTypes = { gradient: GradientEdge }
