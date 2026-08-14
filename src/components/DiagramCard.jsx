import { useState, useRef, useEffect } from 'react'
import { tagColor } from '../services'
import { relativeTime } from '../timeAgo'
import { DiagramMinimap } from './DiagramMinimap'

// ─── Card ─────────────────────────────────────────────────────────────────────

export function DiagramCard({ diagram, title, updatedAt, tags, onOpen, onViewCode, onDelete }) {
  const [active, setActive] = useState(false) // hover OR keyboard focus (for the card's own lift)
  const [confirming, setConfirming] = useState(false) // delete: awaiting the confirm click
  const confirmTimer = useRef(null)

  useEffect(() => () => { if (confirmTimer.current) clearTimeout(confirmTimer.current) }, [])

  function handleDeleteClick(e) {
    e.stopPropagation()
    if (confirming) {
      if (confirmTimer.current) clearTimeout(confirmTimer.current)
      setConfirming(false)
      onDelete()
      return
    }
    setConfirming(true)
    confirmTimer.current = setTimeout(() => setConfirming(false), 3000)
  }

  function resetConfirm() {
    if (confirmTimer.current) clearTimeout(confirmTimer.current)
    setConfirming(false)
  }

  return (
    <div
      className="dc-card"
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setActive(false) }}
      style={{
        background: '#ffffff', borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        border: active ? '2px solid #1c1e21' : '2px solid transparent',
        boxShadow: active ? '0 8px 28px rgba(0,0,0,0.18), 0 0 0 3px rgba(28,30,33,0.08)' : '0 1px 4px rgba(0,0,0,0.05)',
        transform: active ? 'translateY(-2px)' : 'translateY(0)',
        position: 'relative',
      }}
    >
      {/* Actions are shown on hover / keyboard focus, and ALWAYS on touch devices
          (coarse pointers can't hover) - CSS so it works without pointer events. */}
      <style>{`
        .dc-card .dc-actions { opacity: 0; pointer-events: none; transition: opacity .12s ease; }
        .dc-card:hover .dc-actions, .dc-card:focus-within .dc-actions { opacity: 1; pointer-events: auto; }
        @media (hover: none) { .dc-card .dc-actions { opacity: 1; pointer-events: auto; } }
      `}</style>

      {/* Full-bleed transparent overlay button — the actual open control. Sits
          below .dc-actions in stacking order so the action buttons stay clickable
          and are no longer nested inside an interactive element (a11y fix). */}
      <button
        className="dc-open"
        aria-label={`Open ${title}`}
        onClick={onOpen}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          border: 'none', background: 'transparent', cursor: 'pointer',
          padding: 0, margin: 0, zIndex: 1,
        }}
      />

      {/* Header */}
      <div style={{ padding: '13px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#1c1e21', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {title}
        </span>
        <span style={{ fontSize: 10, color: '#8a8d91', flexShrink: 0 }}>{relativeTime(updatedAt)}</span>
      </div>

      {/* Tags */}
      {tags?.length > 0 && (
        <div style={{ padding: '0 13px 8px', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {tags.map(t => { const s = tagColor(t); return (
            <span key={t} style={{ fontSize: 11, fontWeight: 700, padding: '1px 4px', borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}`, letterSpacing: '0.02em', lineHeight: 1.4 }}>{t}</span>
          ); })}
        </div>
      )}

      {/* Minimap */}
      <div style={{ padding: '0 12px 13px' }}>
        <DiagramMinimap diagram={diagram} />
      </div>

      {/* Actions (visibility handled by the CSS above) */}
      <div className="dc-actions" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4, zIndex: 2 }} onClick={e => e.stopPropagation()}>
        <button onClick={onViewCode} title="View code" aria-label="View code"
          style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e4e6e8', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#8a8d91" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </button>
        {onDelete && (confirming ? (
          <button onClick={handleDeleteClick} onBlur={resetConfirm} title="Confirm delete"
            style={{ height: 26, borderRadius: 7, border: '1px solid #dc2626', background: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px', fontSize: 10, fontWeight: 700, color: '#ffffff', whiteSpace: 'nowrap', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            Delete?
          </button>
        ) : (
          <button onClick={handleDeleteClick} title="Delete" aria-label="Delete"
            style={{ width: 26, height: 26, borderRadius: 7, border: '1px solid #e4e6e8', background: '#ffffff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}
