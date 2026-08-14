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
      background: '#ffffff', border: `1.5px solid ${color}30`, borderRadius: 14,
      padding: '14px 16px', minWidth: 130, display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 8, position: 'relative',
      boxShadow: `0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04)`,
    }}>
      <Handle type="target" position={Position.Left}   style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="target" position={Position.Top}    style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: 'none' }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: 'none' }} />
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        background: `${color}12`, border: `1px solid ${color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 4,
      }}>
        {svc.icon
          ? <img src={svc.icon} alt={label} width={32} height={32} style={{ objectFit: 'contain' }} />
          : <span style={{ fontSize: svc.emoji ? 24 : 16, fontWeight: 700, color }}>{svc.emoji || label[0]?.toUpperCase()}</span>
        }
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', letterSpacing: '-0.1px', lineHeight: 1.3 }}>{label}</div>
        {svc.sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 2, fontWeight: 600 }}>{svc.sub}</div>}
      </div>
    </div>
  )
})

// eslint-disable-next-line react-refresh/only-export-components -- nodeTypes must live alongside AwsNode for <ReactFlow nodeTypes={nodeTypes}>
export const nodeTypes = { awsNode: AwsNode }
