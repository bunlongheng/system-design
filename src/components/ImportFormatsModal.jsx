import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'

// ─── Import Formats Modal ──────────────────────────────────────────────────

export default function ImportFormatsModal({ open, onClose, copiedLabel, onCopy }) {
  const dialogRef = useRef(null)
  const previousFocusRef = useRef(null)

  // Move focus into the dialog when it opens, and restore it to whatever
  // triggered the open once the dialog closes.
  useEffect(() => {
    if (open) {
      previousFocusRef.current = document.activeElement
      dialogRef.current?.querySelector(FOCUSABLE_SELECTOR)?.focus()
    } else {
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  function handleKeyDown(e) {
    if (e.key !== 'Tab') return
    const focusables = dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR)
    if (!focusables || !focusables.length) return
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus()
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus()
    }
  }

  if (!open) return null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
      <div onClick={e => e.stopPropagation()} onKeyDown={handleKeyDown} ref={dialogRef} role="dialog" aria-modal="true" style={{ background: '#ffffff', borderRadius: 16, padding: '28px 32px', width: 560, maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Create a diagram</h2>
          <button onClick={onClose} aria-label="Close" style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: 12, color: '#65676b', margin: '0 0 20px', lineHeight: 1.6 }}>Just ask an AI agent, paste a Mermaid graph, or POST the API. Every node must be a real service (the create step rejects unknown ids).</p>
        {[
          { label: 'Ask an AI agent', tag: 'MCP', tagColor: '#16a34a', code: `"Create a system design for a URL shortener"\n\nAny MCP agent uses the system-design server:\n  list_services         valid node keys\n  get_diagram_schema    the { title, nodes, edges } shape\n  create_system_design  builds it, returns the URL` },
          { label: 'Paste Mermaid (Cmd+V)', tag: 'Auto-render', tagColor: '#6366f1', code: `graph LR\n  user[User] --> apigw[API Gateway]\n  apigw --> lambda[Lambda]\n  lambda --> dynamo[DynamoDB]` },
          { label: 'HTTP API', tag: 'Bearer', tagColor: '#0ea5e9', code: `curl -X POST /api/ai/system-designs \\\n  -H "Authorization: Bearer $SECRET" \\\n  -d '{"title":"URL Shortener",\n       "nodes":[{"id":"user"},{"id":"apigw"},{"id":"lambda"}],\n       "edges":[{"source":"user","target":"apigw"},\n                {"source":"apigw","target":"lambda"}]}'` },
        ].map(({ label, tag, tagColor, code }) => (
          <div key={label} style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21' }}>{label}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: tagColor, background: `${tagColor}14`, borderRadius: 4, padding: '2px 7px' }}>{tag}</span>
            </div>
            <div style={{ position: 'relative' }}>
              <pre style={{ margin: 0, padding: '12px 14px', background: `${tagColor}0d`, borderRadius: 8, border: `1px solid ${tagColor}33`, borderLeft: `3px solid ${tagColor}`, fontSize: 11, color: '#1c1e21', fontFamily: "'JetBrains Mono', 'Fira Code', monospace", lineHeight: 1.7, overflowX: 'auto', whiteSpace: 'pre' }}>{code}</pre>
              <button
                onClick={() => onCopy(label, code)}
                style={{ position: 'absolute', top: 8, right: 8, background: copiedLabel === label ? tagColor : '#ffffff', border: `1px solid ${tagColor}44`, borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: copiedLabel === label ? '#ffffff' : tagColor, cursor: 'pointer', transition: 'all 0.15s' }}
              >{copiedLabel === label ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
