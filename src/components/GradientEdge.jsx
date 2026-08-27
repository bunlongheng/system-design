import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

// Edge whose line is a gradient from the SOURCE node's color to the TARGET
// node's color (colors passed in via edge.data). The label badge carries the
// same gradient with white bold text + shadow so it stays readable.
export function GradientEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, label,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  })
  const c1 = data?.sourceColor || '#6b7280'
  const c2 = data?.targetColor || '#6b7280'
  const gid = `grad-${id}`

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={{ stroke: `url(#${gid})`, strokeWidth: 1.5 }} />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              background: `linear-gradient(90deg, ${c1}, ${c2})`,
              color: '#ffffff', fontSize: 8, fontWeight: 700, lineHeight: 1.4,
              padding: '2px 7px', borderRadius: 999, whiteSpace: 'nowrap', pointerEvents: 'none',
              textShadow: '0 1px 2px rgba(0,0,0,0.5)', letterSpacing: '0.01em',
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- edgeTypes must live alongside GradientEdge for <ReactFlow edgeTypes={edgeTypes}>
export const edgeTypes = { gradient: GradientEdge }
