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
      background: '#ffffff', border: `1.5px solid ${color}`, borderRadius: 0,
      padding: '12px 16px', minWidth: 130, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 7, position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
    }}>
      <Handle type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      {/* Logo only - no frame behind it */}
      {svc.icon
        ? <img src={svc.icon} alt={label} width={40} height={40} style={{ objectFit: 'contain', marginTop: 2 }} />
        : <span style={{ fontSize: svc.emoji ? 30 : 22, fontWeight: 700, color, marginTop: 2, lineHeight: 1 }}>{svc.emoji || label[0]?.toUpperCase()}</span>
      }
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px', lineHeight: 1.3 }}>{label}</div>
        {svc.sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{svc.sub}</div>}
      </div>
    </div>
  )
})

// eslint-disable-next-line react-refresh/only-export-components -- nodeTypes must live alongside AwsNode for <ReactFlow nodeTypes={nodeTypes}>
export const nodeTypes = { awsNode: AwsNode }
