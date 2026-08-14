import { useState, useEffect, useCallback, useRef } from 'react'
import diagramData from './data/diagram.json'
import SignInScreen from './components/SignInScreen'
import { IndexView } from './views/IndexView'
import { DetailView } from './views/DetailView'

// ─── Default data ─────────────────────────────────────────────────────────────

function decorateEdge({ color, animated, ...e }) {
  return {
    ...e, animated: animated ?? false,
    style: { stroke: color, strokeWidth: 1.8 },
    labelStyle: { fill: '#374151', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 1 },
    labelBgPadding: [4, 8], labelBgBorderRadius: 6,
  }
}

const defaultNodes = diagramData.nodes.map(n => ({ ...n, type: 'awsNode', data: { id: n.id } }))
const defaultEdges = diagramData.edges.map(decorateEdge)

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

  function deleteDiagram(id) {
    fetch(`/api/system-designs/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) { showToastMsg('Delete failed'); return }
      loadDiagrams()
    })
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
    const e = d.data.edges.map(decorateEdge)
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
      <IndexView
        toast={toast}
        search={search} setSearch={setSearch}
        user={user} canAI={canAI}
        showMenu={showMenu} setShowMenu={setShowMenu} menuRef={menuRef}
        showDocs={showDocs} setShowDocs={setShowDocs}
        copiedLabel={copiedLabel} setCopiedLabel={setCopiedLabel}
        filtered={filtered}
        onOpen={openDiagram}
        onViewCode={setCodeDiagram}
        onDeleteDiagram={deleteDiagram}
        signOut={signOut}
        showAIPrompt={showAIPrompt} setShowAIPrompt={setShowAIPrompt}
        aiPrompt={aiPrompt} setAiPrompt={setAiPrompt}
        aiThinking={aiThinking} aiInputRef={aiInputRef} submitAI={submitAI}
        codeDiagram={codeDiagram} setCodeDiagram={setCodeDiagram}
        codeCopied={codeCopied} setCodeCopied={setCodeCopied}
      />
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
    <DetailView
      toast={toast}
      setView={setView}
      showDetailCode={showDetailCode} setShowDetailCode={setShowDetailCode}
      rfInstance={rfInstance} flashZoomHud={flashZoomHud} zoomHudRef={zoomHudRef}
      showSharePanel={showSharePanel} setShowSharePanel={setShowSharePanel}
      activeDiagram={activeDiagram}
      detailCodeCopied={detailCodeCopied} setDetailCodeCopied={setDetailCodeCopied}
      nodes={nodes} edges={edges}
      exportPng={exportPng} exportCode={exportCode} exportJson={exportJson}
      copyLink={copyLink} copiedLink={copiedLink}
      shareAction={shareAction} copiedShare={copiedShare}
      copyCode={copyCode} copiedCode={copiedCode}
      showDocs={showDocs} setShowDocs={setShowDocs}
      copiedLabel={copiedLabel} setCopiedLabel={setCopiedLabel}
    />
  )
}
