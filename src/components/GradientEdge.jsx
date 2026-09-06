import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, useInternalNode, useReactFlow, Position } from '@xyflow/react'

// ─── Edge geometry ────────────────────────────────────────────────────────────
// Edges attach to a face of the box, spread evenly across it and centered: one
// edge lands dead center, two sit symmetrically either side of center, three or
// more keep the same even spacing. Which face is chosen per edge, from the
// direction of the partner, so things to the right attach on the right and
// things below attach on the bottom.
//
// Spread points beat one shared anchor: five lines converging on a single spot
// is a knot, and it also piles every step marker on top of the same pixel.

// A pair of boxes on the same axis gets a straight connector - lining them up was
// deliberate and the diagram should show it. "On the same axis" is proportional:
// the off-axis drift has to be within 5% of how far apart they are, so a long run
// tolerates a few pixels of slop while two boxes close together have to be
// genuinely square. ALIGN_TOL is the floor, so an exactly snapped pair reads
// straight even when they nearly touch.
const ALIGN_TOL = 8
const ALIGN_RATIO = 0.05
const MAX_GAP = 44 // widest spacing between neighbouring attach points on a face

const onAxis = (drift, span) => drift <= ALIGN_TOL || drift <= span * ALIGN_RATIO

const centerOf = n => ({
  x: n.internals.positionAbsolute.x + n.measured.width / 2,
  y: n.internals.positionAbsolute.y + n.measured.height / 2,
})

// Which face of `from` faces `to` - the dominant axis between their centers.
function sideFor(from, to) {
  const dx = to.x - from.x, dy = to.y - from.y
  return Math.abs(dx) >= Math.abs(dy)
    ? (dx >= 0 ? Position.Right : Position.Left)
    : (dy >= 0 ? Position.Bottom : Position.Top)
}

// Where THIS edge attaches to `node`, given everything else sharing that face.
// Peers are ordered by where their far end sits along the face, so neighbouring
// lines never cross on their way in.
function attachPoint(node, nodeId, otherNode, edgeId, edges, nodeOf) {
  const c = centerOf(node)
  const side = sideFor(c, centerOf(otherNode))
  const horizontal = side === Position.Left || side === Position.Right

  const peers = []
  for (const e of edges) {
    const farId = e.source === nodeId ? e.target : e.target === nodeId ? e.source : null
    if (!farId || farId === nodeId) continue
    const far = nodeOf(farId)
    if (!far?.measured?.width) continue
    const fc = centerOf(far)
    if (sideFor(c, fc) !== side) continue
    peers.push({ id: e.id, along: horizontal ? fc.y : fc.x })
  }
  peers.sort((a, b) => a.along - b.along || (a.id < b.id ? -1 : 1))

  const n = Math.max(1, peers.length)
  const idx = Math.max(0, peers.findIndex(p => p.id === edgeId))
  const face = horizontal ? node.measured.height : node.measured.width
  const gap = Math.min(face / (n + 1), MAX_GAP)
  const offset = (idx - (n - 1) / 2) * gap // 1 edge -> 0, dead center

  const w2 = node.measured.width / 2, h2 = node.measured.height / 2
  if (side === Position.Right) return { x: c.x + w2, y: c.y + offset, side, alone: n === 1 }
  if (side === Position.Left) return { x: c.x - w2, y: c.y + offset, side, alone: n === 1 }
  if (side === Position.Bottom) return { x: c.x + offset, y: c.y + h2, side, alone: n === 1 }
  return { x: c.x + offset, y: c.y - h2, side, alone: n === 1 }
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
  let sSide = Position.Right, tSide = Position.Left
  let aligned = false
  if (sourceNode?.measured?.width && targetNode?.measured?.width) {
    const nodeOf = nid => (nid === source ? sourceNode : nid === target ? targetNode : internalById(nid))
    const sp2 = attachPoint(sourceNode, source, targetNode, id, allEdges, nodeOf)
    const tp2 = attachPoint(targetNode, target, sourceNode, id, allEdges, nodeOf)
    sx = sp2.x; sy = sp2.y; sSide = sp2.side
    tx = tp2.x; ty = tp2.y; tSide = tp2.side

    // Straight run for a pair that lines up - but only when neither face is
    // sharing slots, otherwise forcing this one to center would collide with a
    // neighbour's slot.
    if (sp2.alone && tp2.alone) {
      const sc = centerOf(sourceNode), tc = centerOf(targetNode)
      const driftY = Math.abs(sc.y - tc.y), driftX = Math.abs(sc.x - tc.x)
      if (driftX >= driftY && onAxis(driftY, driftX)) {
        aligned = true
        const y = (sc.y + tc.y) / 2
        sy = y; ty = y
      } else if (onAxis(driftX, driftY)) {
        aligned = true
        const x = (sc.x + tc.x) / 2
        sx = x; tx = x
      }
    }
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
  } else if (aligned) {
    // Lined up: straight line, edge to facing edge.
    path = `M${sx},${sy} L${tx},${ty}`
    labelX = (sx + tx) / 2
    labelYRaw = (sy + ty) / 2
  } else {
    // Rounded elbow: leave the box perpendicular to the face the stem came out
    // of, make ONE turn, and arrive perpendicular to the target's face. Because
    // every edge off a node shares the same anchor, fan-outs still read as one
    // stem splitting - but each branch now meets its box square instead of
    // curving into a corner.
    ;[path, labelX, labelYRaw] = getSmoothStepPath({
      sourceX: sx, sourceY: sy, sourcePosition: sSide,
      targetX: tx, targetY: ty, targetPosition: tSide,
      borderRadius: 18,
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
