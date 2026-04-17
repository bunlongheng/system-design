import { useEffect, useState } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const JIRA_BASE = 'https://thryv.atlassian.net/browse'
const CLOUD_ID = '7a4d58f5-1abe-4cf5-a65c-e6deaeef7098'

const STATUS_COLOR = {
  'Blocked':          { bg: '#fef2f2', text: '#dc2626', dot: '#ef4444' },
  'Dev In Progress':  { bg: '#fffbeb', text: '#d97706', dot: '#f59e0b' },
  'QA In Progress':   { bg: '#fff7ed', text: '#ea580c', dot: '#f97316' },
  'Dev Backlog':      { bg: '#f9fafb', text: '#6b7280', dot: '#9ca3af' },
  'QA Backlog':       { bg: '#eff6ff', text: '#2563eb', dot: '#3b82f6' },
  'Dev Complete':     { bg: '#f0fdf4', text: '#16a34a', dot: '#22c55e' },
  'Released':         { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a' },
  'Complete':         { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a' },
  'Deployed':         { bg: '#f0fdf4', text: '#15803d', dot: '#16a34a' },
  'Canceled':         { bg: '#f9fafb', text: '#9ca3af', dot: '#d1d5db' },
}

const PRIORITY_COLOR = {
  P1: '#ef4444',
  P2: '#f97316',
  P3: '#eab308',
  P4: '#9ca3af',
}

const TYPE_ICON = {
  Bug:      '🐛',
  Story:    '📖',
  Task:     '✅',
  QA:       '🔬',
  'Sub-task': '↳',
  Epic:     '⚡',
}

const MC_TEAM  = ['Jacob Fuller', 'Eduardo Lobo', 'Boris Palacios Alarcon', 'Steven Vores', 'Jens Larsen']
const ZPI_TEAM = ['Bunlong Heng', 'Ryan Watkins', 'Miguel Araujo', 'Luis Ogando Estrella', 'Gabriel Jose Peralta Taveras', 'Juan Pena Castaneda', 'Isabel Jimenez']

function teamOf(assignee) {
  if (!assignee) return 'unassigned'
  if (MC_TEAM.some(n => assignee.includes(n.split(' ')[0]))) return 'mc'
  if (ZPI_TEAM.some(n => assignee.includes(n.split(' ')[0]))) return '3pi'
  return 'other'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const c = STATUS_COLOR[status] || { bg: '#f9fafb', text: '#6b7280', dot: '#9ca3af' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 8px', borderRadius: 20,
      background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {status}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const color = PRIORITY_COLOR[priority] || '#9ca3af'
  return (
    <span style={{
      display: 'inline-block', padding: '2px 7px', borderRadius: 4,
      background: `${color}18`, color, fontSize: 11, fontWeight: 700,
    }}>
      {priority || '—'}
    </span>
  )
}

function TeamTag({ assignee }) {
  const team = teamOf(assignee)
  const map = {
    mc:         { label: 'MC',    bg: '#eff6ff', color: '#2563eb' },
    '3pi':      { label: '3PI',   bg: '#f0fdf4', color: '#16a34a' },
    other:      { label: 'Other', bg: '#faf5ff', color: '#7c3aed' },
    unassigned: { label: '—',     bg: '#f9fafb', color: '#9ca3af' },
  }
  const t = map[team]
  return (
    <span style={{
      padding: '2px 7px', borderRadius: 4,
      background: t.bg, color: t.color,
      fontSize: 11, fontWeight: 600,
    }}>{t.label}</span>
  )
}

// ─── Filters ──────────────────────────────────────────────────────────────────

const ALL_STATUSES = ['All', 'Blocked', 'Dev In Progress', 'QA In Progress', 'Dev Backlog', 'QA Backlog', 'Dev Complete', 'Released', 'Complete', 'Canceled']

function FilterBar({ status, setStatus, search, setSearch, total, filtered }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
      {/* Search */}
      <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', opacity: 0.4 }}
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          placeholder="Search tickets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '7px 12px 7px 30px', borderRadius: 8,
            border: '1px solid #e5e7eb', fontSize: 13, color: '#374151',
            outline: 'none', background: '#f9fafb',
          }}
        />
      </div>

      {/* Status pills */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {ALL_STATUSES.map(s => {
          const active = status === s
          const c = STATUS_COLOR[s] || { dot: '#9ca3af' }
          return (
            <button key={s} onClick={() => setStatus(s)} style={{
              padding: '4px 11px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, transition: 'all 0.15s',
              background: active ? '#111827' : '#f3f4f6',
              color: active ? '#fff' : '#6b7280',
            }}>
              {s !== 'All' && <span style={{
                display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                background: active ? '#fff' : c.dot, marginRight: 5, verticalAlign: 'middle',
              }} />}
              {s}
            </button>
          )
        })}
      </div>

      <span style={{ fontSize: 12, color: '#9ca3af', whiteSpace: 'nowrap' }}>
        {filtered} / {total} tickets
      </span>
    </div>
  )
}

// ─── Stats row ────────────────────────────────────────────────────────────────

function StatsRow({ issues }) {
  const blocked  = issues.filter(i => i.status === 'Blocked').length
  const inprog   = issues.filter(i => i.status.includes('In Progress')).length
  const p1       = issues.filter(i => i.priority === 'P1').length
  const mc_block = issues.filter(i => i.status === 'Blocked' && teamOf(i.assignee) === 'mc').length

  const stats = [
    { label: 'Total Tickets',    value: issues.length,  color: '#6b7280' },
    { label: 'Blocked',          value: blocked,        color: '#ef4444' },
    { label: 'In Progress',      value: inprog,         color: '#f97316' },
    { label: 'P1 Issues',        value: p1,             color: '#dc2626' },
    { label: 'MC-side Blockers', value: mc_block,       color: '#a855f7' },
  ]

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
      {stats.map(s => (
        <div key={s.label} style={{
          flex: 1, minWidth: 110,
          background: '#fff', border: '1px solid #f3f4f6',
          borderRadius: 12, padding: '12px 16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Table ────────────────────────────────────────────────────────────────────

function IssueTable({ issues }) {
  if (!issues.length) return (
    <div style={{ textAlign: 'center', padding: 48, color: '#9ca3af', fontSize: 14 }}>
      No tickets match your filter.
    </div>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
            {['Type', 'Key', 'Summary', 'Status', 'Priority', 'Assignee', 'Team', 'Updated'].map(h => (
              <th key={h} style={{
                padding: '8px 12px', textAlign: 'left',
                fontSize: 11, fontWeight: 700, color: '#9ca3af',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {issues.map((issue, idx) => (
            <tr key={issue.key} style={{
              borderBottom: '1px solid #f9fafb',
              background: issue.status === 'Blocked' ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fafafa',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
            onMouseLeave={e => e.currentTarget.style.background = issue.status === 'Blocked' ? '#fff5f5' : idx % 2 === 0 ? '#fff' : '#fafafa'}
            >
              <td style={{ padding: '10px 12px', fontSize: 16 }}>
                {TYPE_ICON[issue.type] || '📄'}
              </td>
              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                <a href={`${JIRA_BASE}/${issue.key}`} target="_blank" rel="noopener noreferrer"
                  style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none', fontSize: 12 }}>
                  {issue.key}
                </a>
              </td>
              <td style={{ padding: '10px 12px', maxWidth: 320 }}>
                <span style={{ color: '#111827', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {issue.summary}
                </span>
              </td>
              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                <StatusBadge status={issue.status} />
              </td>
              <td style={{ padding: '10px 12px' }}>
                <PriorityBadge priority={issue.priority} />
              </td>
              <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: '#374151', fontSize: 12 }}>
                {issue.assignee || <span style={{ color: '#d1d5db' }}>Unassigned</span>}
              </td>
              <td style={{ padding: '10px 12px' }}>
                <TeamTag assignee={issue.assignee} />
              </td>
              <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: 11, whiteSpace: 'nowrap' }}>
                {issue.updated}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function QTMDashboard() {
  const [issues,   setIssues]   = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)
  const [status,   setStatus]   = useState('All')
  const [search,   setSearch]   = useState('')
  const [lastSync, setLastSync] = useState(null)

  async function fetchIssues() {
    setLoading(true)
    setError(null)
    try {
      const jql = encodeURIComponent('project = QTM ORDER BY updated DESC')
      const fields = 'summary,status,assignee,priority,issuetype,updated'
      const res = await fetch(
        `/jira/rest/api/3/search?jql=${jql}&fields=${fields}&maxResults=100`
      )
      if (!res.ok) throw new Error(`Jira returned ${res.status}`)
      const data = await res.json()
      setIssues(data.issues.map(i => ({
        key:      i.key,
        summary:  i.fields.summary,
        status:   i.fields.status?.name || '',
        priority: i.fields.priority?.name || '',
        type:     i.fields.issuetype?.name || '',
        assignee: i.fields.assignee?.displayName || '',
        updated:  i.fields.updated?.slice(0, 10) || '',
      })))
      setLastSync(new Date().toLocaleTimeString())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchIssues() }, [])

  const filtered = issues.filter(i => {
    const matchStatus = status === 'All' || i.status === status
    const matchSearch = !search || i.summary.toLowerCase().includes(search.toLowerCase()) || i.key.toLowerCase().includes(search.toLowerCase())
    return matchStatus && matchSearch
  })

  return (
    <div style={{
      width: '100vw', minHeight: '100vh',
      background: 'linear-gradient(135deg, #c8cdd8 0%, #d8dce6 50%, #c4c9d6 100%)',
      padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      boxSizing: 'border-box',
    }}>
      <div style={{
        maxWidth: 1400, margin: '0 auto',
        background: '#fff', borderRadius: 20,
        boxShadow: '0 2px 4px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.1), 0 32px 64px rgba(0,0,0,0.08)',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 'calc(100vh - 48px)',
      }}>

        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}>⚡</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', letterSpacing: '-0.3px' }}>
                QTM Board
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1, fontWeight: 500 }}>
                Quantum Project · All Issues
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {lastSync && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>Synced {lastSync}</span>
            )}
            <button onClick={fetchIssues} disabled={loading} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb',
              background: '#fff', cursor: loading ? 'not-allowed' : 'pointer',
              fontSize: 12, fontWeight: 600, color: '#374151',
              opacity: loading ? 0.6 : 1,
            }}>
              <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', flex: 1, overflowY: 'auto' }}>
          {error ? (
            <div style={{
              padding: 20, borderRadius: 12, background: '#fef2f2',
              border: '1px solid #fecaca', color: '#dc2626', fontSize: 13,
            }}>
              <strong>Could not load tickets:</strong> {error}
              <br /><span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'block' }}>
                Make sure JIRA_EMAIL and JIRA_TOKEN are set in .env.local and restart the dev server.
              </span>
            </div>
          ) : loading ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#9ca3af' }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
              <div style={{ fontSize: 14 }}>Loading QTM tickets...</div>
            </div>
          ) : (
            <>
              <StatsRow issues={issues} />
              <FilterBar
                status={status} setStatus={setStatus}
                search={search} setSearch={setSearch}
                total={issues.length} filtered={filtered.length}
              />
              <IssueTable issues={filtered} />
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '10px 24px', borderTop: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 11, color: '#d1d5db' }}>
            Blocked rows highlighted in red · Click ticket key to open in Jira
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
            <span style={{ fontSize: 11, color: '#9ca3af' }}>
              {issues.length} tickets · {issues.filter(i => i.status === 'Blocked').length} blocked
            </span>
          </div>
        </div>

      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
