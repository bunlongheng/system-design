import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import diagramData from '../data/diagram.json'
import { tagColor } from '../services'
import ImportFormatsModal from '../components/ImportFormatsModal'
import { nodeTypes } from '../components/AwsNode'
import { edgeTypes } from '../components/GradientEdge'
import { Toast } from '../components/Toast'

// ─── Detail (canvas) view ───────────────────────────────────────────────────

export function DetailView({
  toast,
  setView,
  showDetailCode, setShowDetailCode,
  rfInstance: rfInstanceRef, flashZoomHud, zoomHudRef,
  showSharePanel, setShowSharePanel,
  showSteps, setShowSteps,
  activeDiagram,
  detailCodeCopied, setDetailCodeCopied,
  nodes, edges, onNodesChange,
  exportPng, exportCode, exportJson, copyLink, copiedLink, shareAction, copiedShare, copyCode, copiedCode,
  showDocs, setShowDocs, copiedLabel, onCopyFormat,
  showToastMsg,
}) {
  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
      <Toast message={toast.message} visible={toast.visible} />

      {/* Header — diagrams-style floating pill toolbar */}
      <header style={{
        height: 54, background: '#ffffff', borderBottom: '1px solid #e4e6e8',
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10, flexShrink: 0,
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

        {/* Diagram name */}
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {activeDiagram?.title || 'Untitled diagram'}
        </span>

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
        <div style={{ flex: 1, position: 'relative', background: '#e8ecf0' }}>
          <ReactFlow
            className={showSteps ? 'sd-steps-on' : ''}
            nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onInit={inst => { rfInstanceRef.current = inst }}
            onMoveEnd={(_, viewport) => flashZoomHud(viewport.zoom)}
            fitView fitViewOptions={{ padding: 0.15 }}
            nodesDraggable nodesConnectable={false} elementsSelectable
            panOnDrag zoomOnScroll minZoom={0.2} maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant="dots" gap={24} size={1} color="#d1d5db" />
          </ReactFlow>

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

            {/* Diagram info */}
            <div style={{ marginTop: 24, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: 10 }}>Diagram Info</div>
            <div style={{ background: '#ffffff', borderRadius: 10, padding: '12px 14px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{activeDiagram?.title || 'IFTTT System Design'}</div>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                {nodes.length} nodes · {edges.length} edges
              </div>
              {activeDiagram?.tags?.length > 0 && (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginTop: 8 }}>
                  {activeDiagram.tags.map(t => { const s = tagColor(t); return (
                    <span key={t} style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.text, border: `1px solid ${s.border}` }}>{t}</span>
                  ); })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Import Formats modal (shared) */}
      <ImportFormatsModal
        open={showDocs}
        onClose={() => setShowDocs(false)}
        copiedLabel={copiedLabel}
        onCopy={onCopyFormat}
      />

      <style>{`
        /* Step number badges: hidden until the Steps toggle turns them on. */
        .sd-step-badge { display: none; }
        .sd-steps-on .sd-step-badge { display: flex; }
        /* On phones the fixed-width side panels would crush the canvas, so drop
           them to full-width bottom sheets over the canvas instead. */
        @media (max-width: 640px) {
          .sd-code-panel, .sd-share-panel {
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
