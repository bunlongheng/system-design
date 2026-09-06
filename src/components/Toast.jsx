// ─── Toast ────────────────────────────────────────────────────────────────────

export function Toast({ message, visible }) {
  return (
    <div role="status" aria-live="polite" style={{
      position: 'fixed', top: 20, left: '50%',
      transform: `translateX(-50%) translateY(${visible ? 0 : -60}px)`,
      background: '#111827', color: '#fff',
      padding: '10px 16px', borderRadius: 12,
      fontSize: 13, fontWeight: 600, zIndex: 9999, pointerEvents: 'none',
      boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
      transition: 'transform 0.3s ease, opacity 0.3s ease',
      opacity: visible ? 1 : 0,
    }}>
      {message}
    </div>
  )
}
