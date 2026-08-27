import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import { findService } from '../services'

// ─── Custom Node ──────────────────────────────────────────────────────────────

export const AwsNode = memo(function AwsNode({ data }) {
  const svc = findService(data)
  const color = svc.color || '#6b7280'
  const label = svc.label || data.label || data.id

  return (
    <div style={{
      background: `${color}14`, border: `1px solid ${color}`, borderRadius: 0,
      padding: '12px 16px', minWidth: 130, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 7, position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
    }}>
      <Handle type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      {/* Logo only - no frame, never an emoji. Every known service has an icon;
          the letter fallback only guards against a bad id the gate should reject. */}
      {svc.icon
        ? <img src={svc.icon} alt={label} width={48} height={48} style={{ objectFit: 'contain', marginTop: 2 }} />
        : <span style={{ fontSize: 26, fontWeight: 700, color, marginTop: 2, lineHeight: 1 }}>{label[0]?.toUpperCase()}</span>
      }
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px', lineHeight: 1.3 }}>{label}</div>
        {svc.sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{svc.sub}</div>}
      </div>
    </div>
  )
})

// ─── Start/End marker node ─────────────────────────────────────────────────────
// A separate pill node arrowed into the entry node ("Start here") or out of a
// terminal node ("Destination") - clearer than a badge stuck on the node.
export const MarkerNode = memo(function MarkerNode({ data }) {
  const start = data.kind === 'start'
  const color = start ? '#16a34a' : '#dc2626'
  const label = start ? 'Start here' : 'Destination'
  // The connector arrow is drawn as part of the node (start: exits right toward
  // the entry node; end: enters from the left, from the terminal node) - more
  // reliable than a React Flow edge on a dynamically-added node.
  const connector = (
    <svg
      width="70" height="12" viewBox="0 0 70 12"
      style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', [start ? 'left' : 'right']: '100%', overflow: 'visible' }}
    >
      <line className="sd-marker-line" x1="0" y1="6" x2="60" y2="6" stroke={color} strokeWidth="1.5" />
      <path d="M60 2.5 L67 6 L60 9.5" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <div style={{
      position: 'relative', display: 'flex', alignItems: 'center', gap: 7,
      background: '#ffffff', border: `2px solid ${color}`, borderRadius: 999,
      padding: '6px 13px 6px 7px', boxShadow: `0 2px 6px ${color}33`, whiteSpace: 'nowrap',
    }}>
      {connector}
      <span style={{ width: 22, height: 22, borderRadius: '50%', background: color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {start
          ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
          : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
        }
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: '0.03em' }}>{label}</span>
    </div>
  )
})

// eslint-disable-next-line react-refresh/only-export-components -- nodeTypes must live alongside AwsNode for <ReactFlow nodeTypes={nodeTypes}>
export const nodeTypes = { awsNode: AwsNode, marker: MarkerNode }
