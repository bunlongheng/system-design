import { useState, useEffect, useCallback, useRef } from 'react'
import { applyNodeChanges } from '@xyflow/react'
import diagramData from './data/diagram.json'
import SignInScreen from './components/SignInScreen'
import { IndexView } from './views/IndexView'
import { DetailView } from './views/DetailView'
import { layoutElements } from './layout'
import { findService } from './services'

// ─── Default data ─────────────────────────────────────────────────────────────

const colorOf = id => findService({ id })?.color || '#6b7280'

// Every edge renders as a gradient (source color -> target color) and is
// animated with marching motion. Node id === service key, so we can look up
// each endpoint's brand color directly.
function buildEdges(rawEdges) {
  return rawEdges.map((e, i) => ({
    id: e.id || `e${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: 'gradient',
    animated: true,
    data: { sourceColor: colorOf(e.source), targetColor: colorOf(e.target), step: i + 1 },
  }))
}

// Datastores that can be the "source of truth", most-authoritative first: primary
// DBs, then object storage, then cache/search. The single "Destination" marker
// lands on the highest-priority one present - never a queue, cache-as-endpoint, or
// a plain leaf service.
const SOURCE_OF_TRUTH = [
  'dynamo', 'dynamodb', 'rds', 'postgres', 'mysql', 'aurora', 'spanner', 'cockroach',
  'cassandra', 'keyspaces', 'mongodb', 'bigtable',
  's3', 'storage',
  'redis', 'elasticache', 'memcached', 'opensearch', 'elasticsearch',
]

// Exactly ONE "Start here" and ONE "Destination" per diagram - never more, never
// both on the same node. Start = the source of step 1 (the first action, robust
// even for closed loops). Destination = the top-priority datastore (source of
// truth where data lives). Rendered as separate pill nodes, toggled from header.
function buildMarkers(nodes, edges) {
  if (!nodes.length) return { nodes: [], edges: [] }
  const byId = id => nodes.find(n => n.id === id)
  const hasIncoming = new Set(edges.map(e => e.target))

  // Start: source of the first edge; else any node with no incoming edge; else node 0.
  let startId = edges[0] && edges[0].source && byId(edges[0].source) ? edges[0].source : null
  if (!startId) startId = (nodes.find(n => !hasIncoming.has(n.id)) || nodes[0]).id

  // Destination: single top-priority datastore, but never the Start node.
  let endId = SOURCE_OF_TRUTH.find(id => byId(id) && id !== startId) || null

  const mNodes = []
  const s = byId(startId)
  if (s) {
    const p = s.position || { x: 0, y: 0 }
    // +37 vertically centers the ~110px node against the 36px marker pill.
    mNodes.push({ id: `__start_${startId}`, type: 'marker', position: { x: p.x - 200, y: p.y + 37 }, width: 132, height: 36, data: { kind: 'start' }, draggable: false, selectable: false })
  }
  const e = endId && byId(endId)
  if (e) {
    const p = e.position || { x: 0, y: 0 }
    mNodes.push({ id: `__end_${endId}`, type: 'marker', position: { x: p.x + 210, y: p.y + 37 }, width: 132, height: 36, data: { kind: 'end' }, draggable: false, selectable: false })
  }
  return { nodes: mNodes, edges: [] }
}

const defaultEdges = buildEdges(diagramData.edges)
const defaultNodes = diagramData.nodes.map(n => ({ ...n, type: 'awsNode', data: { id: n.id } }))

// ─── App ──────────────────────────────────────────────────────────────────────

// Sample diagrams for index page (fallback when the API has none saved)
const SEED = [
  { id: 'ifttt', title: 'IFTTT System Design', data: diagramData, updatedAt: new Date().toISOString(), tags: ['AWS', 'Architecture'] },
]

export default function App() {
  // /demo is a PUBLIC read-only gallery (no sign-in): anyone sees is_public
  // diagrams. The home page ("/") is unchanged - owner-only behind sign-in.
  const isDemo = typeof window !== 'undefined' && window.location.pathname === '/demo'
  const [view, setView] = useState('index') // 'index' | 'detail'
  const [activeDiagram, setActiveDiagram] = useState(null)
  const [nodes, setNodes] = useState(defaultNodes)
  const [edges, setEdges] = useState(defaultEdges)
  const [toast, setToast] = useState({ message: '', visible: false })
  // Declared before the effects/callbacks that depend on it - a const useCallback
  // is not hoisted, so referencing it earlier would be a temporal-dead-zone crash.
  const showToastMsg = useCallback(msg => {
    setToast({ message: msg, visible: true })
    setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500)
  }, [])
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
  const [showDetailsPanel, setShowDetailsPanel] = useState(false)
  const [showSteps, setShowSteps] = useState(false)
  const [badgeMode, setBadgeMode] = useState('dark') // dark | silver | color | plain
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedShare, setCopiedShare] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)
  const [diagrams, setDiagrams] = useState(isDemo ? [] : SEED)
  const [loadingId, setLoadingId] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [user, setUser] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [devBypass, setDevBypass] = useState(false)
  const canAI = (Boolean(user) || import.meta.env.DEV) && !isDemo
  const rfInstance = useRef(null)
  const pendingFit = useRef(false)
  const menuRef = useRef(null)
  const aiInputRef = useRef(null)
  const zoomHudRef = useRef(null)
  const zoomHudTimer = useRef(null)
  const lastZoomRef = useRef(null)

  useEffect(() => { if (showAIPrompt) aiInputRef.current?.focus() }, [showAIPrompt])

  // Escape closes whichever dialog overlay is open, from anywhere on the page.
  useEffect(() => {
    if (!showAIPrompt && !showDocs) return
    const onKeyDown = e => {
      if (e.key !== 'Escape') return
      if (showAIPrompt) setShowAIPrompt(false)
      else if (showDocs) setShowDocs(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [showAIPrompt, showDocs])

  const loadDiagrams = useCallback(() => {
    return fetch(isDemo ? '/api/system-designs/public' : '/api/system-designs')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(rows => {
        const mapped = rows.map(r => ({
          id: r.id,
          title: r.title,
          description: r.description || '',
          pattern: r.pattern || '',
          difficulty: r.difficulty ?? null,
          data: { nodes: r.nodes, edges: r.edges },
          updatedAt: r.created_at,
          tags: r.tags || [],
        }))
        // On /demo never show the IFTTT SEED sample - only real public demos.
        setDiagrams(mapped.length ? mapped : (isDemo ? [] : SEED))
      })
      .catch(() => setDiagrams(isDemo ? [] : SEED))
  }, [isDemo])

  useEffect(() => { loadDiagrams() }, [loadDiagrams])

  // Owner sign-in state + one-time feedback from the OAuth redirect (?auth=).
  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => { if (d.authenticated) setUser(d) }).catch(() => {}).finally(() => setAuthChecked(true))
    const p = new URLSearchParams(window.location.search).get('auth')
    if (p === 'denied') showToastMsg('That Google account is not authorized')
    else if (p === 'error') showToastMsg('Sign-in failed, try again')
    if (p) { const u = new URL(window.location.href); u.searchParams.delete('auth'); window.history.replaceState({}, '', u) }
  }, [showToastMsg])

  function signOut() {
    fetch('/api/auth/logout', { method: 'POST' }).then(() => { setUser(null); showToastMsg('Signed out') }).catch(() => showToastMsg('Sign out failed'))
  }

  function deleteDiagram(id) {
    fetch(`/api/system-designs/${id}`, { method: 'DELETE' }).then(res => {
      if (!res.ok) { showToastMsg('Delete failed'); return }
      loadDiagrams()
    }).catch(() => showToastMsg('Delete failed'))
  }

  function copyFormat(label, code) {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedLabel(label)
      setTimeout(() => setCopiedLabel(null), 2000)
    }).catch(() => showToastMsg('Copy failed'))
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


  async function renderDiagram(text) {
    try {
      const { parseMermaid } = await import('./parseMermaid')
      const { nodes: n, edges: rawE } = parseMermaid(text)
      if (!n.length) { showToastMsg('Nothing to render — check your syntax'); return null }
      const e = buildEdges(rawE)
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
    const raw = d.data.nodes || []
    // Use the owner's saved layout when every node has a stored position;
    // otherwise auto-layout with dagre so nothing overlaps.
    const hasSaved = raw.length > 0 && raw.every(nd => nd.position && Number.isFinite(nd.position.x) && Number.isFinite(nd.position.y))
    // Carry any custom brand fields (label/icon/color/sub) into node data so a
    // bring-your-own-icon node renders its own logo, not a catalog lookup.
    const n = raw.map(nd => ({ ...nd, type: 'awsNode', data: { id: nd.id, label: nd.label, icon: nd.icon, color: nd.color, sub: nd.sub }, ...(hasSaved ? { position: nd.position } : {}) }))
    const e = buildEdges(d.data.edges)
    setNodes(hasSaved ? n : layoutElements(n, e))
    setEdges(e)
    setView('detail')
    pendingFit.current = true
  }

  // Persist the canvas layout (owner only) a beat after a drag ends, so a
  // rearranged diagram stays put on reopen instead of resetting to auto-layout.
  // saveState drives the little spinner/check next to the title: idle|saving|saved.
  const saveTimer = useRef(null)
  const savedResetTimer = useRef(null)
  const [saveState, setSaveState] = useState('idle')
  const doSave = useCallback((diagramId, nds, notify = false) => {
    const payload = nds.filter(n => n.type === 'awsNode' && n.position)
      .map(n => ({ id: n.id, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) } }))
    if (!payload.length) return
    setSaveState('saving')
    fetch(`/api/system-designs/${diagramId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nodes: payload }),
    })
      .then(r => {
        setSaveState(r.ok ? 'saved' : 'idle')
        if (r.ok) {
          // Sync the in-memory gallery copy so reopening the card (without a
          // refetch) shows the saved layout instead of the stale pre-drag one.
          const posById = Object.fromEntries(payload.map(p => [p.id, p.position]))
          setDiagrams(ds => ds.map(d => d.id !== diagramId ? d : {
            ...d,
            data: { ...d.data, nodes: d.data.nodes.map(nd => posById[nd.id] ? { ...nd, position: posById[nd.id] } : nd) },
          }))
        }
        if (notify) showToastMsg(r.ok ? 'Layout saved' : 'Could not save (owner only)')
      })
      .catch(() => { setSaveState('idle'); if (notify) showToastMsg('Could not save') })
      .finally(() => {
        if (savedResetTimer.current) clearTimeout(savedResetTimer.current)
        savedResetTimer.current = setTimeout(() => setSaveState('idle'), 1800)
      })
  }, [showToastMsg])
  const savePositions = useCallback((diagramId, nds) => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave(diagramId, nds), 600)
  }, [doSave])

  // Keyboard shortcuts: Cmd/Ctrl+S saves the current layout immediately (owner,
  // on the detail canvas); Cmd/Ctrl+R re-fetches diagrams in-app (pull-to-refresh)
  // instead of a full browser reload. Both block the browser default.
  useEffect(() => {
    const onKey = e => {
      const mod = e.metaKey || e.ctrlKey
      if (mod && (e.key === 's' || e.key === 'S')) {
        // Always block the browser's "save page as .html" dialog; then save the
        // current layout (with a toast). The backend authorizes owner-only, so a
        // non-owner just gets a "could not save" note.
        e.preventDefault()
        if (view === 'detail' && activeDiagram?.id) {
          if (saveTimer.current) clearTimeout(saveTimer.current)
          doSave(activeDiagram.id, nodes, true)
        }
      } else if (mod && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault()
        loadDiagrams()
        showToastMsg('Refreshed')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [view, canAI, activeDiagram, nodes, doSave, loadDiagrams, showToastMsg])

  // Let nodes be dragged around the canvas (positions live in React state, and
  // are saved to the DB on drag-end when the owner can edit).
  const onNodesChange = useCallback(
    changes => setNodes(nds => {
      const next = applyNodeChanges(changes, nds)
      if (canAI && activeDiagram?.id && changes.some(c => c.type === 'position' && c.dragging === false)) {
        savePositions(activeDiagram.id, next)
      }
      return next
    }),
    [canAI, activeDiagram, savePositions],
  )

  useEffect(() => {
    if (pendingFit.current && rfInstance.current) {
      setTimeout(() => {
        rfInstance.current.fitView({ padding: 0.15, duration: 400 })
        // Record the fitted zoom as the baseline so the first PAN (same zoom)
        // never flashes the HUD.
        setTimeout(() => { lastZoomRef.current = rfInstance.current?.getZoom?.() ?? null }, 450)
      }, 60)
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
        openDiagram({ id: d.id, title: d.title, description: d.description || '', data: { nodes: d.nodes, edges: d.edges }, updatedAt: d.created_at, tags: d.tags || [] })
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

  const onPasteRef = useRef(null)
  onPasteRef.current = async (e) => {
    const active = document.activeElement
    if (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA') return
    const text = e.clipboardData?.getData('text') || ''
    if (/graph\s+(LR|TD|RL|BT)/i.test(text)) {
      const parsed = await renderDiagram(text)
      if (!parsed) return
      setView('detail')
      setActiveDiagram({ id: 'pasted', title: 'Pasted Diagram', data: parsed, updatedAt: new Date().toISOString() })
    }
  }

  useEffect(() => {
    const handlePaste = (e) => onPasteRef.current?.(e)
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [])

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
  if (view === 'index' && !hasIdParam && !devBypass && !isDemo) {
    if (!authChecked) return <SignInScreen loading />
    if (!user) return <SignInScreen devBypass={() => setDevBypass(true)} />
  }

  // ── INDEX VIEW ──────────────────────────────────────────────────────────────
  if (view === 'index') {
    return (
      <IndexView
        toast={toast} showToastMsg={showToastMsg}
        search={search} setSearch={setSearch}
        user={user} canAI={canAI} isDemo={isDemo}
        showMenu={showMenu} setShowMenu={setShowMenu} menuRef={menuRef}
        showDocs={showDocs} setShowDocs={setShowDocs}
        copiedLabel={copiedLabel} onCopyFormat={copyFormat}
        filtered={filtered}
        onRefresh={loadDiagrams}
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
    // Fit all nodes first, then capture on a clean WHITE page with NO dot grid.
    rfInstance.current?.fitView({ padding: 0.15 })
    return new Promise(r => setTimeout(r, 300))
      .then(() => import('html-to-image'))
      .then(({ toPng }) => toPng(el, {
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        filter: node => !(node.classList && node.classList.contains('react-flow__background')),
      }))
      .then(url => {
        const a = document.createElement('a'); a.href = url; a.download = exportFilename('png'); a.click()
      })
      .catch(() => showToastMsg('PNG export requires html-to-image package'))
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
  // Only show on an actual zoom change - panning keeps the same zoom, so it
  // must never flash the HUD.
  function flashZoomHud(z) {
    if (!zoomHudRef.current) return
    const prev = lastZoomRef.current
    lastZoomRef.current = z
    if (prev !== null && Math.abs(z - prev) < 0.001) return // pan, not zoom
    zoomHudRef.current.textContent = `${Math.round(z * 100)}%`
    zoomHudRef.current.style.opacity = '1'
    if (zoomHudTimer.current) clearTimeout(zoomHudTimer.current)
    zoomHudTimer.current = setTimeout(() => {
      if (zoomHudRef.current) zoomHudRef.current.style.opacity = '0'
    }, 900)
  }

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  // Start/Destination marker nodes are always shown (auto-detected from edges).
  const markers = buildMarkers(nodes, edges)
  const displayNodes = [...nodes, ...markers.nodes]
  const displayEdges = [...edges, ...markers.edges]
  // Step-by-step walkthrough, derived from the diagram's edges in flow order.
  const steps = (activeDiagram?.data?.edges || []).map((e, i) => ({
    n: i + 1,
    from: findService({ id: e.source })?.label || e.source,
    to: findService({ id: e.target })?.label || e.target,
    label: e.label || '',
  }))
  return (
    <DetailView
      toast={toast} showToastMsg={showToastMsg}
      setView={setView}
      showDetailCode={showDetailCode} setShowDetailCode={setShowDetailCode}
      rfInstance={rfInstance} flashZoomHud={flashZoomHud} zoomHudRef={zoomHudRef}
      showSharePanel={showSharePanel} setShowSharePanel={setShowSharePanel}
      showDetailsPanel={showDetailsPanel} setShowDetailsPanel={setShowDetailsPanel}
      steps={steps}
      showSteps={showSteps} setShowSteps={setShowSteps}
      badgeMode={badgeMode} setBadgeMode={setBadgeMode}
      activeDiagram={activeDiagram}
      detailCodeCopied={detailCodeCopied} setDetailCodeCopied={setDetailCodeCopied}
      nodes={displayNodes} edges={displayEdges} onNodesChange={onNodesChange}
      exportPng={exportPng} exportCode={exportCode} exportJson={exportJson}
      copyLink={copyLink} copiedLink={copiedLink}
      shareAction={shareAction} copiedShare={copiedShare}
      copyCode={copyCode} copiedCode={copiedCode}
      showDocs={showDocs} setShowDocs={setShowDocs}
      copiedLabel={copiedLabel} onCopyFormat={copyFormat}
      isPublic={isDemo || !user}
      saveState={saveState}
    />
  )
}
