// ─── Cmd/Ctrl + drag snap-align ───────────────────────────────────────────────
// Hold Cmd (Ctrl on Windows) while dragging a node and it latches onto the
// closest edge/center line of another node, so rows and columns line up and the
// edges between them draw as straight lines instead of near-misses. The canvas
// paints a yellow guide on exactly the line returned here, so you can see where
// it is about to land before you let go.

export const SNAP_THRESHOLD = 10 // flow px - how close before it latches

const rectOf = n => ({
  x: n.position.x,
  y: n.position.y,
  w: n.measured?.width ?? n.width ?? 150,
  h: n.measured?.height ?? n.height ?? 100,
})

// The 3 lines a node can align on per axis: leading edge, center, trailing edge.
const linesX = r => [r.x, r.x + r.w / 2, r.x + r.w]
const linesY = r => [r.y, r.y + r.h / 2, r.y + r.h]

// dragged: the node at its un-snapped drag position. others: every other node.
// Returns the corrected position plus the guides to draw (0, 1 or 2 of them).
export function snapAlign(dragged, others, threshold = SNAP_THRESHOLD) {
  const d = rectOf(dragged)
  const best = { x: null, y: null }

  for (const other of others) {
    if (other.id === dragged.id || !other.position) continue
    const r = rectOf(other)
    const axes = [
      ['x', linesX(d), linesX(r)],
      ['y', linesY(d), linesY(r)],
    ]
    for (const [axis, mine, theirs] of axes) {
      for (const a of mine) {
        for (const b of theirs) {
          const delta = b - a
          if (Math.abs(delta) > threshold) continue
          if (!best[axis] || Math.abs(delta) < Math.abs(best[axis].delta)) {
            best[axis] = { delta, at: b, other: r }
          }
        }
      }
    }
  }

  const position = {
    x: d.x + (best.x?.delta ?? 0),
    y: d.y + (best.y?.delta ?? 0),
  }

  // Guides span from the far edge of one node to the far edge of the other, so
  // the line visibly connects the two things being aligned.
  const snapped = { ...d, ...position }
  const guides = []
  if (best.x) {
    const o = best.x.other
    guides.push({
      axis: 'x', at: best.x.at,
      from: Math.min(snapped.y, o.y),
      to: Math.max(snapped.y + snapped.h, o.y + o.h),
    })
  }
  if (best.y) {
    const o = best.y.other
    guides.push({
      axis: 'y', at: best.y.at,
      from: Math.min(snapped.x, o.x),
      to: Math.max(snapped.x + snapped.w, o.x + o.w),
    })
  }
  return { position, guides }
}
