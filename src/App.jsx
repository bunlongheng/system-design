import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, Background } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import diagramData from './data/diagram.json'
import { tagColor } from './services'
import ImportFormatsModal from './components/ImportFormatsModal'
import SignInScreen from './components/SignInScreen'
import { nodeTypes } from './components/AwsNode'
import { DiagramCard } from './components/DiagramCard'
import { Toast } from './components/Toast'
import { AIThinkingOverlay } from './components/AIThinkingOverlay'

const GITHUB_AVATAR = 'https://avatars.githubusercontent.com/u/11523064?v=4'

// ─── Default data ─────────────────────────────────────────────────────────────

const defaultNodes = diagramData.nodes.map(n => ({ ...n, type: 'awsNode', data: { id: n.id } }))
const defaultEdges = diagramData.edges.map(({ color, animated, ...e }) => ({
  ...e, animated: animated ?? false,
  style: { stroke: color, strokeWidth: 1.8 },
  labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
  labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
  labelBgPadding: [4, 8], labelBgBorderRadius: 6,
}))

// ─── App ──────────────────────────────────────────────────────────────────────

// Sample diagrams for index page (fallback when the API has none saved)
const SEED = [
  { id: 'ifttt', title: 'IFTTT System Design', data: diagramData, updatedAt: new Date().toISOString(), tags: ['AWS', 'Architecture'] },
]

export default function App() {
  const [view, setView] = useState('index') // 'index' | 'detail'
  const [activeDiagram, setActiveDiagram] = useState(null)
  const [nodes, setNodes] = useState(defaultNodes)
  const [edges, setEdges] = useState(defaultEdges)
  const [toast, setToast] = useState({ message: '', visible: false })
  const [search, setSearch] = useState('')
  const [showDocs, setShowDocs] = useState(false)
  const [copiedLabel, setCopiedLabel] = useState(null)
  const [codeDiagram, setCodeDiagram] = useState(null)
  const [codeCopied, setCodeCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showAIPrompt, setShowAIPrompt] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiThinking, setAiThinking] = useState(false)
  const [showDetailCode, setShowDetailCode] = useState(false)
  const [detailCodeCopied, setDetailCodeCopied] = useState(false)
  const [showSharePanel, setShowSharePanel] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [diagrams, setDiagrams] = useState(SEED)
  const [loadingId, setLoadingId] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [devBypass, setDevBypass] = useState(false)
  const canAI = Boolean(user) || import.meta.env.DEV
  const rfInstance = useRef(null)
  const pendingFit = useRef(false)
  const menuRef = useRef(null)
  const aiInputRef = useRef(null)
  const zoomHudRef = useRef(null)
  const zoomHudTimer = useRef(null)

  useEffect(() => { if (showAIPrompt) aiInputRef.current?.focus() }, [showAIPrompt])

  const loadDiagrams = useCallback(() => {
    fetch('/api/system-designs')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(rows => {
        const mapped = rows.map(r => ({
          id: r.id,
          title: r.title,
          data: { nodes: r.nodes, edges: r.edges },
          updatedAt: r.created_at,
          tags: r.tags || [],
        }))
        setDiagrams(mapped.length ? mapped : SEED)
      })
      .catch(() => setDiagrams(SEED))
  }, [])

  useEffect(() => { loadDiagrams() }, [loadDiagrams])

  // Owner sign-in state + one-time feedback from the OAuth redirect (?auth=).
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.authenticated) setUser(d) }).catch(() => {}).finally(() => setAuthChecked(true))
    const p = new URLSearchParams(window.location.search).get('auth')
    if (p === 'denied') showToastMsg('That Google account is not authorized')
    else if (p === 'error') showToastMsg('Sign-in failed, try again')
    if (p) { const u = new URL(window.location.href); u.searchParams.delete('auth'); window.history.replaceState({}, '', u) }
  }, [])

  function signOut() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => { setUser(null); showToastMsg('Signed out') })
  }

  async function submitAI() {
    if (!aiPrompt.trim() || aiThinking) return
    setAiThinking(true)
    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { showToastMsg(data.error ?? 'Generation failed'); setAiThinking(false); return }
      // data should have { nodes, edges, title }
      const diagram = { id: `ai-${Date.now()}`, title: data.title || 'AI Generated', data: { nodes: data.nodes, edges: data.edges }, updatedAt: new Date().toISOString(), tags: ['AI'] }
      openDiagram(diagram)
      loadDiagrams()
      setShowAIPrompt(false)
      setAiPrompt('')
      setAiThinking(false)
      import('canvas-confetti').then(m => m.default({ particleCount: 120, spread: 80, origin: { y: 0.3 }, zIndex: 9999 }))
      showToastMsg(`Generated "${data.title}" — ${data.nodes.length} nodes`)
    } catch {
      showToastMsg('Network error')
      setAiThinking(false)
    }
  }

  function showToastMsg(msg) {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }

  async function renderDiagram(text) {
    try {
      const { parseMermaid } = await import('./parseMermaid')
      const { nodes: n, edges: e } = parseMermaid(text)
      if (!n.length) { showToastMsg('Nothing to render — check your syntax'); return null }
      setNodes(n)
      setEdges(e)
      pendingFit.current = true
      showToastMsg(`Rendered ${n.length} nodes · ${e.length} edges`)
      import('canvas-confetti').then(m => m.default({ particleCount: 120, spread: 80, origin: { y: 0.3 }, zIndex: 9999 }))
      return { nodes: n, edges: e }
    } catch {
      showToastMsg('Could not parse diagram')
      return null
    }
  }

  function openDiagram(d) {
    setActiveDiagram(d)
    const n = d.data.nodes.map(nd => ({ ...nd, type: 'awsNode', data: { id: nd.id } }))
    const e = d.data.edges.map(({ color, animated, ...edge }) => ({
      ...edge, animated: animated ?? false,
      style: { stroke: color, strokeWidth: 1.8 },
      labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
      labelBgPadding: [4, 8], labelBgBorderRadius: 6,
    }))
    setNodes(n)
    setEdges(e)
    setView('detail')
    pendingFit.current = true
  }

  useEffect(() => {
    if (pendingFit.current && rfInstance.current) {
      setTimeout(() => rfInstance.current.fitView({ padding: 0.12, duration: 400 }), 60)
      pendingFit.current = false
    }
  }, [nodes])

  // Load a saved design when the URL has ?id= (the URL the artifact API returns).
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id')
    if (!id) return
    setLoadingId(true)
    fetch(`/api/system-designs/${id}`)
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(d => {
        openDiagram({ id: d.id, title: d.title, data: { nodes: d.nodes, edges: d.edges }, updatedAt: d.created_at, tags: d.tags || [] })
        setLoadingId(false)
      })
      .catch(() => {
        setLoadError(true)
        setLoadingId(false)
      })
  }, [])

  function backToGallery() {
    setLoadError(false)
    const url = new URL(window.location.href)
    url.searchParams.delete('id')
    window.history.replaceState({}, '', url)
    setView('index')
  }

  const onPaste = useCallback(async (e) => {
    const active = document.activeElement
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return
    const text = e.clipboardData?.getData('text') || ''
    if (/graph\s+(LR|TD|RL|BT)/i.test(text)) {
      const parsed = await renderDiagram(text)
      if (!parsed) return
      setView('detail')
      setActiveDiagram({ id: 'pasted', title: 'Pasted Diagram', data: parsed, updatedAt: new Date().toISOString() })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [onPaste])

  useEffect(() => {
    const h = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = diagrams.filter(d =>
    !search.trim() || d.title.toLowerCase().includes(search.toLowerCase())
  )

  // ── ?id LOADING / ERROR STATES ──────────────────────────────────────────────
  if (loadingId) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#f4f5f7',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{
          width: 40, height: 40, border: '3px solid #e4e6e8',
          borderTopColor: '#1c1e21', borderRadius: '50%',
          animation: 'sd-spin 0.8s linear infinite', marginBottom: 16,
        }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: '#1c1e21' }}>Loading design...</div>
        <style>{`@keyframes sd-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (loadError) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#f4f5f7',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      }}>
        <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e4e6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#8a8d91" strokeWidth={1.5} strokeLinecap="round"><circle cx="12" cy="12" r="9"/><line x1="9" y1="9" x2="15" y2="15"/><line x1="15" y1="9" x2="9" y2="15"/></svg>
        </div>
        <p style={{ fontSize: 14, color: '#1c1e21', fontWeight: 600, margin: 0 }}>Design not found</p>
        <p style={{ fontSize: 13, color: '#8a8d91', marginTop: 6, marginBottom: 20 }}>It may have been deleted or the link is invalid</p>
        <button onClick={backToGallery} style={{ padding: '10px 20px', background: '#1c1e21', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
          Back to gallery
        </button>
      </div>
    )
  }

  // ── SIGN-IN GATE (signed-out home only) ─────────────────────────────────────
  // Shared /?id= diagram views stay public (handled by the detail view); only the
  // home/gallery requires sign-in. While the auth check is in flight, show the
  // animated graph splash so an authed owner never flashes the sign-in card.
  const hasIdParam = Boolean(new URLSearchParams(window.location.search).get('id'))
  if (view === 'index' && !hasIdParam && !devBypass) {
    if (!authChecked) return <SignInScreen loading />
    if (!user) return <SignInScreen devBypass={() => setDevBypass(true)} />
  }

  // ── INDEX VIEW ──────────────────────────────────────────────────────────────
  if (view === 'index') {
    return (
      <div style={{ minHeight: '100vh', background: '#f4f5f7', fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Toast message={toast.message} visible={toast.visible} />
        <style>{`
          @media (max-width: 640px) {
            .sd-header { padding: 0 16px !important; }
            .sd-search-wrap { flex: 1 !important; width: auto !important; }
            .sd-search-wrap input { width: 100% !important; }
            .sd-main { padding: 20px 16px 100px !important; }
            .sd-grid { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)) !important; gap: 10px !important; }
          }
        `}</style>

        {/* ── Header ── */}
        <header className="sd-header" style={{ background: '#ffffff', borderBottom: '1px solid #e4e6e8', height: 56, position: 'sticky', top: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1600, margin: '0 auto', padding: '0 32px', height: '100%', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <img src="/icon.png" width={28} height={28} alt="" style={{ borderRadius: 8 }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#1c1e21', letterSpacing: '-0.01em' }}>System Design</span>
            </div>

            {/* Search */}
            <div className="sd-search-wrap" style={{ position: 'relative', width: 260 }}>
              <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a8d91' }} width={13} height={13} viewBox="0 0 20 20" fill="none">
                <circle cx={9} cy={9} r={6} stroke="currentColor" strokeWidth={1.8} />
                <path d="M14 14l3 3" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
              </svg>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..."
                style={{ width: '100%', padding: '7px 14px 7px 32px', boxSizing: 'border-box', border: '1px solid #e4e6e8', borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: '#1c1e21', background: '#f4f5f7' }} />
            </div>

            <div style={{ flex: 1 }} />

            {/* Avatar / Menu */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button onClick={() => setShowMenu(v => !v)}
                style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', border: showMenu ? '2px solid #1c1e21' : '2px solid #e4e6e8', cursor: 'pointer', padding: 0, background: '#e4e6e8', transition: 'border-color 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1e21', userSelect: 'none' }}>B</span>
                <img src={GITHUB_AVATAR} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { e.target.style.display = 'none' }} />
              </button>
              {showMenu && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 210, background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.12)', border: '1px solid #e4e6e8', overflow: 'hidden', zIndex: 50 }}>
                  <div style={{ padding: '14px 16px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1c1e21' }}>{user ? 'Bunlong Heng' : 'System Design'}</div>
                    <div style={{ fontSize: 11, color: '#8a8d91', marginTop: 3 }}>{user ? user.email : 'Not signed in'}</div>
                  </div>
                  <div style={{ height: 1, background: '#f0f1f3' }} />
                  <button onClick={() => { setShowDocs(true); setShowMenu(false); }}
                    style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1c1e21', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                    <span style={{ fontSize: 14 }}>📋</span> Import formats
                  </button>
                  {canAI && (
                    <button onClick={() => { setShowAIPrompt(true); setShowMenu(false); }}
                      style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1c1e21', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize: 14 }}>✦</span> Generate with AI
                    </button>
                  )}
                  <div style={{ height: 1, background: '#f0f1f3' }} />
                  {user ? (
                    <button onClick={() => { signOut(); setShowMenu(false); }}
                      style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', fontFamily: 'inherit', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize: 14 }}>↪</span> Sign out
                    </button>
                  ) : (
                    <a href="/api/auth/login"
                      style={{ width: '100%', padding: '11px 16px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#1c1e21', fontFamily: 'inherit', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', boxSizing: 'border-box' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#f4f5f7')} onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                      <span style={{ fontSize: 14 }}>🔑</span> Sign in with Google
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ── Content ── */}
        <main className="sd-main" style={{ padding: '32px 32px 100px', maxWidth: 1600, margin: '0 auto' }}>
          {filtered.length === 0 && (
            <div style={{ position: 'fixed', inset: 0, top: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', background: '#f4f5f7' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#e4e6e8', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="#8a8d91" strokeWidth={1.5} strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="3"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="13" y2="13"/></svg>
              </div>
              <p style={{ fontSize: 14, color: '#1c1e21', fontWeight: 600, margin: 0 }}>{search ? 'No diagrams found' : 'No diagrams yet'}</p>
              <p style={{ fontSize: 13, color: '#8a8d91', marginTop: 6 }}>{search ? 'Try a different search' : 'Paste Mermaid code to get started'}</p>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="sd-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
              {filtered.map(d => (
                <DiagramCard
                  key={d.id}
                  diagram={d.data}
                  title={d.title}
                  updatedAt={d.updatedAt}
                  tags={d.tags}
                  onOpen={() => openDiagram(d)}
                  onViewCode={() => setCodeDiagram(d)}
                  onDelete={canAI ? () => {
                    fetch(`/api/system-designs/${d.id}`, { method: 'DELETE' }).then(() => loadDiagrams())
                  } : undefined}
                />
              ))}
            </div>
          )}
        </main>

        {/* ── FAB ── */}
        {canAI && (
          <button onClick={() => setShowAIPrompt(true)} title="Generate with AI"
            style={{ position: 'fixed', bottom: 32, right: 32, width: 52, height: 52, borderRadius: '50%', background: '#1c1e21', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer', fontSize: 24, color: '#fff', transition: 'transform 0.15s, box-shadow 0.15s', zIndex: 5 }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(0,0,0,0.4)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)' }}
          >✦</button>
        )}

        {/* ── AI Prompt Modal ── */}
        {aiThinking && <AIThinkingOverlay />}
        {showAIPrompt && !aiThinking && (
          <div onClick={() => setShowAIPrompt(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
            <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 20, padding: '32px 32px 28px', width: 520, boxShadow: '0 32px 80px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#1c1e21', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1c1e21', margin: 0 }}>Generate with AI</h3>
                  <p style={{ fontSize: 12, color: '#8a8d91', margin: 0 }}>Describe your system and Claude will build the diagram</p>
                </div>
              </div>
              <textarea
                ref={aiInputRef}
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitAI(); if (e.key === 'Escape') setShowAIPrompt(false); }}
                placeholder='e.g. "Netflix streaming architecture with CDN, load balancer, microservices, and caching layers"'
                rows={4}
                style={{ width: '100%', padding: '12px 14px', fontSize: 14, border: '1.5px solid #e4e6e8', borderRadius: 12, outline: 'none', fontFamily: 'inherit', resize: 'none', color: '#1c1e21', background: '#f8f9fa', boxSizing: 'border-box', lineHeight: 1.6 }}
              />
              <p style={{ fontSize: 11, color: '#bcc0c4', margin: '8px 0 20px' }}>Cmd + Enter to generate</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowAIPrompt(false)} style={{ padding: '10px 20px', border: '1px solid #e4e6e8', borderRadius: 10, background: '#f4f5f7', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', color: '#65676b' }}>Cancel</button>
                <button onClick={submitAI} disabled={!aiPrompt.trim() || aiThinking} style={{ padding: '10px 24px', background: aiPrompt.trim() ? '#1c1e21' : '#e4e6e8', color: aiPrompt.trim() ? '#fff' : '#8a8d91', border: 'none', borderRadius: 10, cursor: aiPrompt.trim() ? 'pointer' : 'default', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background 0.15s' }}>
                  {aiThinking ? 'Generating...' : 'Generate ✦'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Import Formats Modal ── */}
        <ImportFormatsModal
          open={showDocs}
          onClose={() => setShowDocs(false)}
          copiedLabel={copiedLabel}
          onCopy={(label, code) => { navigator.clipboard.writeText(code); setCopiedLabel(label); setTimeout(() => setCopiedLabel(null), 2000); }}
        />

        {/* ── Code slide-in panel ── */}
        {codeDiagram && (
          <div onClick={() => { setCodeDiagram(null); setCodeCopied(false); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
            <div onClick={e => e.stopPropagation()} style={{
              position: 'absolute', left: 0, top: 0, bottom: 0, width: 420, maxWidth: '90vw',
              background: '#ffffff', boxShadow: '8px 0 32px rgba(0,0,0,0.12)',
              display: 'flex', flexDirection: 'column',
              animation: 'sd-slide-left 0.2s ease-out',
            }}>
              <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #e4e6e8', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#1c1e21" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1c1e21', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{codeDiagram.title}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(JSON.stringify(codeDiagram.data, null, 2)); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000); }}
                  style={{ background: codeCopied ? '#22c55e' : '#f4f5f7', border: '1px solid #e4e6e8', borderRadius: 6, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: codeCopied ? '#fff' : '#65676b', cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0 }}
                >{codeCopied ? 'Copied!' : 'Copy'}</button>
                <button onClick={() => { setCodeDiagram(null); setCodeCopied(false); }} style={{ background: 'none', border: 'none', color: '#8a8d91', cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}>✕</button>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 0 }}>
                <pre style={{
                  margin: 0, padding: '16px 20px', fontSize: 12, lineHeight: 1.75, color: '#1c1e21',
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace", whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{JSON.stringify(codeDiagram.data, null, 2)}</pre>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes sd-slide-left {
            from { transform: translateX(-100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>
      </div>
    )
  }

  // ── Export/Share functions ───────────────────────────────────────────────────

  function exportFilename(ext) {
    const t = (activeDiagram?.title || 'diagram').replace(/[^a-z0-9]/gi, '-').toLowerCase()
    const now = new Date()
    return `${t}-${now.toISOString().slice(0, 10)}-${now.toTimeString().slice(0, 5).replace(':', '-')}.${ext}`
  }

  function exportPng() {
    const el = document.querySelector('.react-flow')
    if (!el) return
    import('html-to-image').then(({ toPng }) => {
      toPng(el, { backgroundColor: '#e8ecf0', pixelRatio: 2 }).then(url => {
        const a = document.createElement('a'); a.href = url; a.download = exportFilename('png'); a.click()
      })
    }).catch(() => {
      // fallback: screenshot via canvas not available, just notify
      showToastMsg('PNG export requires html-to-image package')
    })
  }

  function exportJson() {
    const data = activeDiagram?.data || diagramData
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    a.download = exportFilename('json'); a.click()
  }

  function exportCode() {
    const data = activeDiagram?.data || diagramData
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'text/plain' }))
    a.download = exportFilename('txt'); a.click()
  }

  function copyLink() {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setCopiedLink(true); setTimeout(() => setCopiedLink(false), 1500)
      showToastMsg('Link copied!')
    })
  }

  function shareAction() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: activeDiagram?.title || 'System Design', url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(url).then(() => {
        setCopiedShare(true); setTimeout(() => setCopiedShare(false), 1500)
        showToastMsg('Link copied!')
      })
    }
  }

  function copyCode() {
    const data = activeDiagram?.data || diagramData
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1500)
    })
  }

  // ── Zoom HUD ────────────────────────────────────────────────────────────────
  function flashZoomHud(z) {
    if (!zoomHudRef.current) return
    zoomHudRef.current.textContent = `${Math.round(z * 100)}%`
    zoomHudRef.current.style.opacity = '1'
    if (zoomHudTimer.current) clearTimeout(zoomHudTimer.current)
    zoomHudTimer.current = setTimeout(() => {
      if (zoomHudRef.current) zoomHudRef.current.style.opacity = '0'
    }, 900)
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
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
          <button onClick={() => rfInstance.current?.fitView({ padding: 0.12, duration: 400 })} style={{
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
                  navigator.clipboard.writeText(code)
                  setDetailCodeCopied(true)
                  setTimeout(() => setDetailCodeCopied(false), 2000)
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
            nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onInit={inst => { rfInstance.current = inst }}
            onMoveEnd={(_, viewport) => flashZoomHud(viewport.zoom)}
            fitView fitViewOptions={{ padding: 0.12 }}
            nodesDraggable={false} nodesConnectable={false} elementsSelectable={false}
            panOnDrag zoomOnScroll minZoom={0.3} maxZoom={2.5}
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
        onCopy={(label, code) => { navigator.clipboard.writeText(code); setCopiedLabel(label); setTimeout(() => setCopiedLabel(null), 2000); }}
      />

      <style>{`
        @keyframes sd-slide-left {
          from { transform: translateX(-100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes sd-slide-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
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
