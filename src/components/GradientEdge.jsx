import { BaseEdge, EdgeLabelRenderer, getBezierPath } from '@xyflow/react'

// Edge whose line is a gradient from the SOURCE node's color to the TARGET
// node's color. The label badge sits at the midpoint; its per-edge gradient is
// exposed as CSS vars (--c1/--c2) so a wrapper class can switch the badge
// between neutral-silver-with-gradient-border and full colorized fill without
// rebuilding edges. The step number (when the Steps toggle is on) is a chip
// attached inside that same badge.
export function GradientEdge({
  id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, label,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  })
  const c1 = data?.sourceColor || '#6b7280'
  const c2 = data?.targetColor || '#6b7280'
  const gid = `grad-${id}`
  const hasStep = data?.step != null

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
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
