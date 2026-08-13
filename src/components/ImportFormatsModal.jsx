import { SERVICES } from '../services'

// ─── Import Formats Modal ──────────────────────────────────────────────────

export default function ImportFormatsModal({ open, onClose, copiedLabel, onCopy }) {
  if (!open) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 16, padding: '28px 32px', width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Import Formats</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: '#65676b', margin: '0 0 20px', lineHeight: 1.6 }}>Two ways to create a system design diagram. Paste Mermaid code anywhere to auto-render.</p>
        {[
          { label: '1. Paste Mermaid (Cmd+V)', tag: 'Auto-detect', tagColor: '#16a34a', code: `graph LR\n  user[User] -->|Trigger event| apigw[API Gateway]\n  apigw -->|Invoke| lambda[Lambda]\n  lambda -->|Store token| dynamo[DynamoDB]\n  lambda -->|Start execution| sfn[Step Functions]` },
          { label: '2. Edit diagram.json', tag: 'Manual', tagColor: '#6366f1', code: `// src/data/diagram.json\n{\n  "nodes": [\n    { "id": "lambda", "position": { "x": 480, "y": 210 } },\n    { "id": "dynamo", "position": { "x": 700, "y": 330 } }\n  ],\n  "edges": [\n    { "id": "e1", "source": "lambda", "target": "dynamo",\n      "label": "Store token", "color": "#dc2626" }\n  ]\n}` },
          { label: 'Supported Services', tag: `${Object.keys(SERVICES).length} services`, tagColor: '#0ea5e9', code: Object.entries(SERVICES).filter(([,v]) => v.icon).map(([k, v]) => `${k.padEnd(14)} → ${v.label} (${v.sub})`).join('\n') },
        ].map(({ label, tag, tagColor, code }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21' }}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 4, padding: '2px 7px' }}>{tag}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <pre style={{ margin: 0, padding: '12px 14px', background: '#f4f5f7', borderRadius: 8, border: '1px solid #e4e6e8', fontSize: 11, color: '#1c1e21', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>{code}</pre>
              <button
                onClick={() => onCopy(label, code)}
                style={{ position: 'absolute', top: 8, right: 8, background: copiedLabel === label ? '#22c55e' : '#ffffff', border: '1px solid #e4e6e8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: copiedLabel === label ? '#ffffff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s' }}
              >{copiedLabel === label ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
