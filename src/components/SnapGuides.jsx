import { ViewportPortal } from '@xyflow/react'

// ─── Snap guides ──────────────────────────────────────────────────────────────
// The yellow lines shown while Cmd/Ctrl-dragging a node: they mark the alignment
// the node has latched onto, so you can see where it lands before releasing.
// Rendered through ViewportPortal so the coordinates are flow coordinates and
// the lines pan/zoom with the canvas.

const PAD = 14 // let the line overshoot both nodes a little so it reads as a guide

export function SnapGuides({ guides = [] }) {
  if (!guides.length) return null
  return (
    <ViewportPortal>
      {guides.map(g => (
        <div
          key={`${g.axis}-${g.at}`}
          className="sd-snap-guide"
          style={{
            position: 'absolute', pointerEvents: 'none', zIndex: 5,
            background: '#eab308',
            boxShadow: '0 0 6px rgba(234,179,8,0.85)',
            ...(g.axis === 'x'
              ? { left: g.at, top: g.from - PAD, width: 1.5, height: g.to - g.from + PAD * 2 }
              : { left: g.from - PAD, top: g.at, height: 1.5, width: g.to - g.from + PAD * 2 }),
          }}
        />
      ))}
    </ViewportPortal>
  )
}
