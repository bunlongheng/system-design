import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import diagramData from '../data/diagram.json'
import ImportFormatsModal from '../components/ImportFormatsModal'
import { nodeTypes } from '../components/AwsNode'
import { edgeTypes } from '../components/GradientEdge'
import { Toast } from '../components/Toast'
import { SnapGuides } from '../components/SnapGuides'
import { Footer } from '../components/Footer'
import { brandFor } from '../brands'

// ─── Detail (canvas) view ───────────────────────────────────────────────────

export function DetailView({
  toast,
  setView,
  showDetailCode, setShowDetailCode,
  rfInstance: rfInstanceRef, flashZoomHud, zoomHudRef,
  showSharePanel, setShowSharePanel,
  showDetailsPanel, setShowDetailsPanel,
  steps = [],
  showSteps, setShowSteps,
  badgeMode, setBadgeMode,
  activeDiagram,
  detailCodeCopied, setDetailCodeCopied,
  nodes, edges, onNodesChange, onNodeDragStop, snapGuides = [],
  exportPng, exportCode, exportJson, copyLink, copiedLink, shareAction, copiedShare, copyCode, copiedCode,
  showDocs, setShowDocs, copiedLabel, onCopyFormat,
  showToastMsg,
  isPublic,
  saveState = 'idle',
  onArrange,
  canUndo, canRedo, onUndo, onRedo,
}) {
  const brand = brandFor(activeDiagram?.title)
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Toast message={toast.message} visible={toast.visible} />

      {/* Header — diagrams-style floating pill toolbar. Scrolls horizontally on
          narrow screens so every action stays reachable instead of clipping. */}
      <header style={{
        height: 54, background: 'linear-gradient(180deg, #fbfbfc 0%, #eef0f3 100%)', borderBottom: '1px solid #e4e7ea',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
        overflowX: 'auto', overflowY: 'hidden', WebkitOverflowScrolling: 'touch',
      }}>
        {/* Back button */}
        <button onClick={() => { setView('index'); setShowDetailCode(false); }}
          aria-label="Back to gallery"
          style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            border: '1px solid #e4e6e8', background: '#ffffff',
            boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
            color: '#64748b', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#e9ecef')}
          onMouseLeave={e => (e.currentTarget.style.background = '#ffffff')}
        >
          <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
        </button>

        {/* Diagram name (with brand logo, matching the card) */}
        {brand && (
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, borderRadius: 6, background: '#ffffff', border: '1px solid #e7e9ee', flexShrink: 0 }}>
            <img src={brand.icon} alt="" width={15} height={15} style={{ objectFit: 'contain' }} />
          </span>
        )}
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {activeDiagram?.title || 'Untitled diagram'}
        </span>

        {/* Layout save indicator: spinner while saving, green check when saved. */}
        {saveState === 'saving' && (
          <span className="sd-save-spin" title="Saving layout..." style={{ flexShrink: 0, width: 16, height: 16, borderRadius: '50%', border: '2px solid #cbd5e1', borderTopColor: '#1c1e21', display: 'inline-block' }} />
        )}
        {saveState === 'saved' && (
          <span className="sd-save-check" title="Layout saved" style={{ flexShrink: 0, width: 17, height: 17, borderRadius: '50%', background: '#16a34a', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </span>
        )}

        <div style={{ flex: 1 }} />

        {/* Action toolbar — floating pill */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          background: '#ffffff', border: '1px solid #e4e6e8', borderRadius: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '4px 6px',
        }}>
          {/* Code toggle */}
          <button onClick={() => setShowDetailCode(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showDetailCode ? '#f1f5f9' : 'transparent',
            color: showDetailCode ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showDetailCode ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showDetailCode) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showDetailCode) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
            </svg>
            Code
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Fit button */}
          <button onClick={() => rfInstanceRef.current?.fitView({ padding: 0.12, duration: 400 })} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', color: '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
            Fit
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Auto-arrange: re-lay-out left-to-right, spread out, step-ordered, then fit */}
          <button onClick={() => onArrange && onArrange()} title="Auto-arrange the layout" style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', color: '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><path d="M10 6.5h4M17.5 10v4M6.5 10v7.5H10"/>
            </svg>
            Arrange
          </button>

          {/* Undo / redo. They appear once there IS something to undo, so a
              freshly opened diagram keeps a clean toolbar, and each button dims
              when its own direction is empty. */}
          {(canUndo || canRedo) && [
            { key: 'undo', label: 'Undo', on: onUndo, enabled: canUndo, hint: 'Undo (Cmd+Z)', d: 'M3 10h13a5 5 0 0 1 0 10h-1M3 10l4-4M3 10l4 4' },
            { key: 'redo', label: 'Redo', on: onRedo, enabled: canRedo, hint: 'Redo (Cmd+Shift+Z)', d: 'M21 10H8a5 5 0 0 0 0 10h1M21 10l-4-4M21 10l-4 4' },
          ].map(b => (
            <button key={b.key} onClick={() => b.enabled && b.on && b.on()} disabled={!b.enabled} title={b.hint}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
                background: 'transparent', color: b.enabled ? '#64748b' : '#cbd5e1',
                cursor: b.enabled ? 'pointer' : 'default', fontSize: 13, fontWeight: 400,
                transition: 'all 0.1s', fontFamily: 'inherit', flexShrink: 0,
              }}
              onMouseEnter={e => { if (b.enabled) e.currentTarget.style.background = '#f1f5f9' }}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={b.d} />
              </svg>
              {b.label}
            </button>
          ))}

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Details (goal + steps) panel toggle */}
          <button onClick={() => setShowDetailsPanel(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showDetailsPanel ? '#f1f5f9' : 'transparent',
            color: showDetailsPanel ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showDetailsPanel ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showDetailsPanel) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showDetailsPanel) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
            Details
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Steps toggle */}
          <button onClick={() => setShowSteps(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showSteps ? '#f1f5f9' : 'transparent',
            color: showSteps ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showSteps ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showSteps) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showSteps) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
              <path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>
            </svg>
            Steps
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Badge style cycle: silver -> color -> dark -> plain */}
          <button onClick={() => {
            const order = ['silver', 'color', 'dark', 'plain']
            setBadgeMode(m => order[(order.indexOf(m) + 1) % order.length])
          }} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: 'transparent', color: '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f1f5f9')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            title="Cycle badge style"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            {{ silver: 'Silver', color: 'Color', dark: 'Dark', plain: 'Plain' }[badgeMode]}
          </button>

          <div style={{ width: 1, height: 18, background: '#e4e6e8', flexShrink: 0, margin: '0 2px' }} />

          {/* Share toggle */}
          <button onClick={() => setShowSharePanel(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 10px', height: 30, borderRadius: 8, border: 'none',
            background: showSharePanel ? '#f1f5f9' : 'transparent',
            color: showSharePanel ? '#1e293b' : '#64748b',
            cursor: 'pointer', fontSize: 13, fontWeight: showSharePanel ? 600 : 400,
            transition: 'all 0.1s', fontFamily: 'inherit',
          }}
            onMouseEnter={e => { if (!showSharePanel) e.currentTarget.style.background = '#f1f5f9' }}
            onMouseLeave={e => { if (!showSharePanel) e.currentTarget.style.background = 'transparent' }}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/>
            </svg>
            Share
          </button>

        </div>
      </header>

      {/* Body — code panel + canvas */}
      <div style={{ flex: 1, display: 'flex', position: 'relative', overflow: 'hidden' }}>

        {/* Code panel (left, slide-in) */}
        {showDetailCode && (
          <div className="sd-code-panel" style={{
            width: 340, flexShrink: 0, background: '#ffffff', borderRight: '1px solid #e4e6e8',
            display: 'flex', flexDirection: 'column', animation: 'sd-slide-left 0.2s ease-out',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #e4e6e8', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
              </svg>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#1c1e21', flex: 1 }}>{activeDiagram?.title || 'diagram.json'}</span>
              <button
                onClick={() => {
                  const code = JSON.stringify(activeDiagram?.data || diagramData, null, 2)
                  navigator.clipboard.writeText(code).then(() => {
                    setDetailCodeCopied(true)
                    setTimeout(() => setDetailCodeCopied(false), 2000)
                  }).catch(() => showToastMsg('Copy failed'))
                }}
                style={{ background: detailCodeCopied ? '#22c55e' : '#f4f5f7', border: '1px solid #e4e6e8', borderRadius: 6, padding: '3px 10px', fontSize: 11, fontWeight: 600, color: detailCodeCopied ? '#fff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
              >{detailCodeCopied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <pre style={{
                margin: 0, padding: '14px 16px', fontSize: 11, lineHeight: 1.75, color: '#1c1e21',
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>{JSON.stringify(activeDiagram?.data || diagramData, null, 2)}</pre>
            </div>
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', background: '#ffffff' }}>
          <ReactFlow
            className={`${showSteps ? 'sd-steps-on ' : ''}sd-badge-${badgeMode}`}
            nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onNodeDragStop={onNodeDragStop}
            /* Cmd/Ctrl is reserved for snap-align while dragging, so additive
               multi-select moves to Shift (box-select already uses Shift). */
            multiSelectionKeyCode="Shift"
            onInit={inst => { rfInstanceRef.current = inst; setTimeout(() => inst.fitView({ padding: 0.15 }), 0) }}
            onMoveEnd={(_, viewport) => flashZoomHud(viewport.zoom)}
            fitView fitViewOptions={{ padding: 0.15 }}
            nodesDraggable nodesConnectable={false} elementsSelectable
            panOnDrag zoomOnScroll minZoom={0.2} maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={24} size={1} color="#e6e8eb" />
            <SnapGuides guides={snapGuides} />
          </ReactFlow>

          {/* Info card overlay - title + what it tests + goal, pinned top-left of the canvas */}
          {(activeDiagram?.pattern || activeDiagram?.description) && (
            <div className="sd-info-card" style={{
              position: 'absolute', top: 16, left: 16, maxWidth: 340, zIndex: 40,
              background: '#ffffff', color: '#1a2129', borderRadius: 0,
              padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              border: '1px solid #e4e6e8',
            }}>
              {activeDiagram?.pattern && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9aa0a6', marginBottom: 3 }}>What it tests</div>
                  <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.45, color: '#1a1a1a' }}>{activeDiagram.pattern}</div>
                </div>
              )}
              {activeDiagram?.description && (
                <div>
                  <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9aa0a6', marginBottom: 3 }}>Goal</div>
                  <div style={{ fontSize: 12, lineHeight: 1.5, color: '#444' }}>{activeDiagram.description}</div>
                </div>
              )}
            </div>
          )}

          {/* Zoom HUD */}
          <div ref={zoomHudRef} style={{
            position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(10,10,15,0.72)', backdropFilter: 'blur(12px)',
            color: '#fff', borderRadius: 100, padding: '7px 20px',
            fontSize: 15, fontWeight: 700, letterSpacing: '0.02em',
            opacity: 0, transition: 'opacity 0.2s ease', pointerEvents: 'none',
            zIndex: 50, boxShadow: '0 2px 16px rgba(0,0,0,0.3)',
          }} />

        </div>

        {/* Details panel (right side): goal + step-by-step walkthrough */}
        {showDetailsPanel && (
          <div className="sd-details-panel" style={{
            width: 320, flexShrink: 0, background: '#ffffff', borderLeft: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', overflowY: 'auto',
            animation: 'sd-slide-right 0.2s ease-out',
          }}>
            <div style={{ padding: '18px 18px 6px' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#1a2129' }}>{activeDiagram?.title || 'Diagram'}</div>
            </div>

            {/* Pattern - the one-line "what this really tests" (fan-out, idempotency, ...) */}
            {activeDiagram?.pattern && (
              <div style={{ padding: '4px 18px 6px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa0a6', marginBottom: 6 }}>What it tests</div>
                <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5, color: '#1a1a1a' }}>
                  {activeDiagram.pattern}
                </div>
              </div>
            )}

            {/* Goal */}
            <div style={{ padding: '10px 18px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9aa0a6', marginBottom: 6 }}>Goal</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: '#444' }}>
                {activeDiagram?.description || 'No description yet for this diagram.'}
              </div>
            </div>

            {/* Steps */}
            {steps.length > 0 && (
              <div style={{ padding: '0 18px 24px' }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 10 }}>Steps ({steps.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {steps.map(s => (
                    <div key={s.n} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 999, background: '#1c1e21', color: '#fff', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{s.n}</span>
                      <div style={{ fontSize: 12.5, lineHeight: 1.5, color: '#334155' }}>
                        <span style={{ fontWeight: 700, color: '#1a2129' }}>{s.from} &rarr; {s.to}</span>
                        {s.label && <span style={{ color: '#64748b' }}>{`  -  ${s.label}`}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share panel (right side) */}
        {showSharePanel && (
          <div className="sd-share-panel" style={{
            width: 240, flexShrink: 0, background: '#f1f5f9', borderLeft: '1px solid #e2e8f0',
            display: 'flex', flexDirection: 'column', padding: '20px 16px',
            animation: 'sd-slide-right 0.2s ease-out',
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 16 }}>Export & Share</div>

            {/* Download grid — exact diagrams app colors */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              <button onClick={exportPng}
                style={{ background: '#FF6188', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >PNG</button>
              <button onClick={exportCode}
                style={{ background: '#FC9867', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >Code</button>
              <button onClick={copyLink}
                style={{ background: copiedLink ? '#A9DC76' : '#FFD866', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedLink ? 'Copied!' : 'Link'}</button>
              <button onClick={exportJson}
                style={{ background: '#A9DC76', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >JSON</button>
              <button onClick={shareAction}
                style={{ background: copiedShare ? '#A9DC76' : '#78DCE8', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedShare ? 'Shared!' : 'Share'}</button>
              <button onClick={copyCode}
                style={{ background: copiedCode ? '#A9DC76' : '#AB9DF2', color: '#221F22', cursor: 'pointer', padding: '7px 0', fontSize: 11, fontWeight: 600, borderRadius: 12, border: 'none', transition: 'all 0.1s', fontFamily: 'inherit' }}
                onMouseEnter={e => (e.currentTarget.style.filter = 'brightness(1.1)')}
                onMouseLeave={e => (e.currentTarget.style.filter = 'none')}
              >{copiedCode ? 'Copied!' : 'Copy'}</button>
            </div>
          </div>
        )}
      </div>

      {/* Public footer - only on a demoed (public) diagram, never owner views */}
      {isPublic && <Footer />}

      {/* Import Formats modal (shared) */}
      <ImportFormatsModal
        open={showDocs}
        onClose={() => setShowDocs(false)}
        copiedLabel={copiedLabel}
        onCopy={onCopyFormat}
      />

      <style>{`
        /* Layout save indicator next to the title. */
        @keyframes sd-save-rot { to { transform: rotate(360deg); } }
        .sd-save-spin { animation: sd-save-rot 0.7s linear infinite; }
        @keyframes sd-save-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.15); } 100% { transform: scale(1); opacity: 1; } }
        .sd-save-check { animation: sd-save-pop 0.28s ease-out; }
        /* Start/End connector arrow: same thickness + marching flow as edges. */
        @keyframes sd-marker-dash { to { stroke-dashoffset: -18; } }
        .sd-marker-line { stroke-dasharray: 5 4; animation: sd-marker-dash 0.5s linear infinite; }
        /* Phone: shrink the info card so it doesn't swallow the canvas, and cap
           its height with an internal scroll. */
        @media (max-width: 640px) {
          .sd-info-card { top: 10px !important; left: 10px !important; right: 10px !important; max-width: none !important; padding: 10px 12px !important; max-height: 34vh !important; overflow-y: auto !important; }
        }
        /* Edge label badge - shared layout; per-edge gradient comes from
           --c1/--c2 set inline. Appearance switches by wrapper mode class. */
        .sd-edge-badge {
          position: absolute; display: flex; align-items: center; gap: 4px;
          padding: 3px 8px; border-radius: 999px;
          font-size: 8.5px; font-weight: 700; line-height: 1.35;
          letter-spacing: 0.01em; white-space: nowrap; pointer-events: none;
        }
        /* 1) Silver fill + gradient border, dark text (default) */
        .sd-badge-silver .sd-edge-badge {
          color: #1e2733; border: 1.5px solid transparent;
          background:
            linear-gradient(#e9ebee, #e9ebee) padding-box,
            linear-gradient(90deg, var(--c1), var(--c2)) border-box;
        }
        /* 2) Colorized gradient fill, white text */
        .sd-badge-color .sd-edge-badge {
          color: #fff; border: none; text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          background: linear-gradient(90deg, var(--c1), var(--c2));
        }
        /* 3) Dark badge, white text */
        .sd-badge-dark .sd-edge-badge {
          color: #fff; border: none; background: #1c1e21;
        }
        /* 4) Plain silver, black text */
        .sd-badge-plain .sd-edge-badge {
          color: #1e2733; border: 1.5px solid #c2c6cc; background: #e9ebee;
        }
        /* Step number, first thing in the badge - hidden until Steps is on. */
        .sd-step-chip { display: none; }
        .sd-steps-on .sd-step-chip {
          display: inline-flex; align-items: center; justify-content: center;
          /* Deliberately smaller than the badge's text line, so the circle sits
             INSIDE the pill with clearance top and bottom instead of pressing
             against the border. */
          min-width: 12px; height: 12px; padding: 0 2.5px; border-radius: 999px;
          font-size: 8px; font-weight: 800; line-height: 1;
          background: #1c1e21; color: #fff; flex-shrink: 0;
        }
        /* On a dark badge a dark chip would vanish - flip it. */
        .sd-badge-dark .sd-step-chip, .sd-badge-color .sd-step-chip {
          background: #fff; color: #1c1e21;
        }
        /* On phones the fixed-width side panels would crush the canvas, so drop
           them to full-width bottom sheets over the canvas instead. */
        @media (max-width: 640px) {
          .sd-code-panel, .sd-share-panel, .sd-details-panel {
            position: absolute !important; left: 0 !important; right: 0 !important;
            bottom: 0 !important; top: auto !important; width: 100% !important;
            max-height: 60vh; z-index: 20; border: none !important;
            box-shadow: 0 -10px 30px rgba(0,0,0,0.18);
          }
        }
      `}</style>
    </div>
  )
}
