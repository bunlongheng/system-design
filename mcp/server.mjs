#!/usr/bin/env node
// ─── system-design MCP server ────────────────────────────────────────────────
// Exposes the System Design app to any MCP-capable agent (Claude Code, Claude
// Desktop, etc.) so it can discover, read, create, update, and delete the same
// diagrams the web app renders. Talks straight to the shared Postgres via the
// app's own lib/ layer, so anything created here shows up in the app instantly.
//
// Env (from the repo .env): DATABASE_URL, OWNER_USER_ID. Optional:
// SYSTEM_DESIGNS_APP_URL (default prod) for the shareable links it returns.
import './load-env.mjs' // MUST be first - loads .env before lib/db.js opens the pool
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import db from '../lib/db.js'
import { uniqueSystemDesignSlug } from '../lib/slugs.js'
import { titleBase, MIN_BASE_LEN } from '../lib/title-base.js'
import { ownerId } from '../lib/auth-owner.js'
import { SERVICES } from '../src/services.js'
import { resolveNodeIcons } from '../lib/resolve-icon.js'

const APP_URL = process.env.SYSTEM_DESIGNS_APP_URL || 'https://system-design-bheng.vercel.app'
const urlFor = id => `${APP_URL}/?id=${id}`
const owner = () => {
  const o = ownerId()
  if (!o) throw new Error('OWNER_USER_ID not configured in .env')
  return o
}
const ok = obj => ({ content: [{ type: 'text', text: JSON.stringify(obj, null, 2) }] })
const fail = msg => ({ isError: true, content: [{ type: 'text', text: msg }] })

// Agents pass nodes as { id, x?, y? }; the app stores { id, position:{x,y} } and
// auto-layouts on open, so positions are a starting hint, not load-bearing.
function toStoredNodes(nodes) {
  return nodes.map((n, i) => ({
    id: n.id,
    position: { x: n.x ?? 120 + (i % 6) * 220, y: n.y ?? 120 + Math.floor(i / 6) * 160 },
    // Optional bring-your-own-icon: caller supplies the logo, we just render it.
    ...(n.icon ? { icon: n.icon } : {}),
    ...(n.label ? { label: n.label } : {}),
    ...(n.color ? { color: n.color } : {}),
    ...(n.sub ? { sub: n.sub } : {}),
  }))
}
function toStoredEdges(edges) {
  return edges.map((e, i) => ({
    id: e.id || `e${i + 1}`,
    source: e.source,
    target: e.target,
    ...(e.label ? { label: e.label } : {}),
  }))
}
// A node resolves to a logo if it's a known catalog service OR it carries a custom
// icon (a remote https URL, a data:image URI, or a same-origin /path).
const okCustomIcon = ic => typeof ic === 'string' && (ic.startsWith('/') || ic.startsWith('https://') || /^data:image\//.test(ic))
const unresolvedNodes = nodes => [...new Set(nodes.filter(n => !SERVICES[n.id]?.icon && !okCustomIcon(n.icon)).map(n => n.id))]
// HARD GATE: refuse nodes with no logo. Returns an error result, or null if OK.
const logoGate = nodes => {
  const missing = unresolvedNodes(nodes)
  return missing.length
    ? fail(`Rejected: every node must render a real logo - use a known catalog service id (call list_services), OR give the node a custom "icon" (a remote https URL, a data:image URI, or a /path) plus a "label". Unresolved: ${missing.join(', ')}.`)
    : null
}

// The most recent OTHER diagram (last 7 days) whose title shares this one's base.
async function similarRecent(userId, title, excludeId) {
  const base = titleBase(title)
  if (base.length < MIN_BASE_LEN) return null // too generic to accuse anything
  const { rows } = await db.query(
    `SELECT id, title, created_at FROM system_designs
     WHERE user_id = $1 AND id <> $2 AND deleted_at IS NULL
       AND created_at > now() - interval '7 days'
     ORDER BY created_at DESC LIMIT 40`,
    [userId, excludeId],
  )
  const hit = rows.find(r => titleBase(r.title) === base)
  if (!hit) return null
  const mins = Math.round((Date.now() - new Date(hit.created_at).getTime()) / 60000)
  const age = mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)}h ago`
  return { id: hit.id, title: hit.title, age }
}

const server = new McpServer({ name: 'system-design', version: '1.0.0' })

// ── Discover: how many diagrams, and their shape ────────────────────────────
server.registerTool(
  'list_system_designs',
  {
    title: 'List system designs',
    description: "List all of the owner's saved system-design diagrams (newest first) with their id, title, node/edge counts, and shareable URL.",
    inputSchema: {},
  },
  async () => {
    try {
      const { rows } = await db.query(
        'SELECT id, title, slug, nodes, edges, created_at FROM system_designs WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 200',
        [owner()],
      )
      return ok({
        count: rows.length,
        designs: rows.map(r => ({
          id: r.id, title: r.title, slug: r.slug,
          nodes: r.nodes?.length ?? 0, edges: r.edges?.length ?? 0,
          created_at: r.created_at, url: urlFor(r.id),
        })),
      })
    } catch (e) { return fail(`list failed: ${e.message}`) }
  },
)

// ── Read one diagram in full ────────────────────────────────────────────────
server.registerTool(
  'get_system_design',
  {
    title: 'Get system design',
    description: 'Fetch one diagram by id, returning its full title, nodes, and edges (the exact structure the app renders).',
    inputSchema: { id: z.string().describe('The diagram id (uuid) from list_system_designs') },
  },
  async ({ id }) => {
    try {
      const { rows } = await db.query('SELECT id, title, slug, nodes, edges, created_at FROM system_designs WHERE id = $1 AND deleted_at IS NULL', [id])
      if (!rows.length) return fail(`No diagram with id ${id}`)
      return ok({ ...rows[0], url: urlFor(id) })
    } catch (e) { return fail(`get failed: ${e.message}`) }
  },
)

// ── Create ──────────────────────────────────────────────────────────────────
server.registerTool(
  'create_system_design',
  {
    title: 'Create system design',
    description: "Create a new diagram. Provide a title, nodes, and edges connecting node ids. Each node is EITHER a known catalog service (call list_services), OR a bring-your-own node with a custom `icon` (a remote https logo URL, a data:image URI, or a /path) plus a `label`. Remote https icons are fetched and inlined once so the diagram stays self-contained. Positions are optional (the app auto-layouts). Returns the new id and URL.",
    inputSchema: {
      title: z.string().describe('Descriptive title, e.g. "URL Shortener - Tier 1"'),
      nodes: z.array(z.object({
        id: z.string().describe('A known service key (e.g. "lambda","dynamo","cyclr","hubspot"), or any unique id when bringing your own icon'),
        x: z.number().optional(),
        y: z.number().optional(),
        icon: z.string().optional().describe('Bring-your-own logo: a remote https image URL, a data:image URI, or a same-origin /path. Omit for catalog services.'),
        label: z.string().optional().describe('Display name (required with a custom icon), e.g. "HubSpot"'),
        sub: z.string().optional().describe('Small subtitle under the label, e.g. "CRM"'),
        color: z.string().optional().describe('Brand hex color for the node border/tint, e.g. "#FF7A59"'),
      })).min(1).describe('The services in the diagram'),
      edges: z.array(z.object({
        source: z.string().describe('source node id'),
        target: z.string().describe('target node id'),
        label: z.string().optional().describe('short edge label, e.g. "read/write"'),
      })).default([]).describe('Directed connections between node ids, in flow order'),
    },
  },
  async ({ title, nodes, edges }) => {
    try {
      const gate = logoGate(nodes)
      if (gate) return gate
      const { nodes: iconNodes, failed } = await resolveNodeIcons(nodes)
      if (failed.length) return fail(`Could not fetch the remote icon for node(s): ${failed.join(', ')}. Use an https image URL that returns image/* under 24KB (no redirects), or inline a data:image URI.`)
      const o = owner()
      const slug = await uniqueSystemDesignSlug(o, title)
      const storedNodes = toStoredNodes(iconNodes)
      const storedEdges = toStoredEdges(edges)
      const { rows } = await db.query(
        'INSERT INTO system_designs (user_id, title, slug, nodes, edges, type, tags) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::text[]) RETURNING id',
        [o, title.trim(), slug, JSON.stringify(storedNodes), JSON.stringify(storedEdges), 'system-design', ['MCP']],
      )
      const id = rows[0].id

      // Version-spam guard. An agent that has lost the id of a diagram it just
      // made tends to create "... v2", then "v2.1", then "v2.2" instead of
      // editing. The row is still created (never block the caller), but the
      // response points at the diagram it almost certainly meant to update.
      const near = await similarRecent(o, title, id)
      return ok({
        id,
        url: urlFor(id),
        ...(near ? {
          warning:
            `A diagram named "${near.title}" (id ${near.id}) was created ${near.age} and looks like the same thing ` +
            `under a different version suffix. If this was meant to be a revision, call update_system_design on ` +
            `${near.id} and then delete_system_design on ${id} - do not keep making v2, v2.1, v2.2.`,
          probably_update: near.id,
        } : {}),
      })
    } catch (e) { return fail(`create failed: ${e.message}`) }
  },
)

// ── Update (modify title / nodes / edges) ───────────────────────────────────
server.registerTool(
  'update_system_design',
  {
    title: 'Update system design',
    description:
      'Modify an existing diagram by id. Any of title, nodes, or edges you provide replaces that field; omitted fields are left unchanged. ' +
      'ALWAYS prefer this over creating a "v2" of a diagram you already made - call list_system_designs to find the id. ' +
      'Editing a diagram created within the last 24h needs nothing extra. Past 24h, pass "reason" to say why you are ' +
      'rewriting older work; without a reason the edit is applied to a NEW copy instead, and the original is left untouched.',
    inputSchema: {
      id: z.string().describe('The diagram id to update'),
      reason: z.string().optional().describe('Why an older (>24h) diagram is being changed, e.g. "backfill: correct the Integry decommission date". Recorded on the row.'),
      title: z.string().optional(),
      nodes: z.array(z.object({
        id: z.string(), x: z.number().optional(), y: z.number().optional(),
        icon: z.string().optional().describe('Bring-your-own logo: https URL, data:image URI, or /path'),
        label: z.string().optional(), sub: z.string().optional(), color: z.string().optional(),
      })).optional(),
      edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string().optional() })).optional(),
    },
  },
  async ({ id, reason, title, nodes, edges }) => {
    try {
      let iconNodes = nodes
      if (nodes) {
        const gate = logoGate(nodes); if (gate) return gate
        const r = await resolveNodeIcons(nodes)
        if (r.failed.length) return fail(`Could not fetch the remote icon for node(s): ${r.failed.join(', ')}.`)
        iconNodes = r.nodes
      }

      // Read the target first: we need its age, and its current content to copy
      // from if this turns into a fork.
      const { rows: cur } = await db.query(
        `SELECT id, title, nodes, edges, type, tags,
                (now() - created_at) > interval '24 hours' AS stale
         FROM system_designs WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`,
        [id, owner()],
      )
      if (!cur.length) return fail(`No owned diagram with id ${id} (it may be in trash - call list_trash)`)
      const row = cur[0]

      const nextNodes = iconNodes ? JSON.stringify(toStoredNodes(iconNodes)) : null
      const nextEdges = edges ? JSON.stringify(toStoredEdges(edges)) : null

      // Older than a day and nobody said why -> never block, never silently
      // rewrite history. Fork it: the edit lands on a new diagram and the
      // original stays exactly as it was.
      if (row.stale && !reason?.trim()) {
        const newTitle = (title?.trim() || row.title)
        const o = owner()
        const slug = await uniqueSystemDesignSlug(o, newTitle)
        const { rows: ins } = await db.query(
          'INSERT INTO system_designs (user_id, title, slug, nodes, edges, type, tags) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::text[]) RETURNING id',
          [o, newTitle, slug, nextNodes ?? JSON.stringify(row.nodes), nextEdges ?? JSON.stringify(row.edges), row.type || 'system-design', row.tags || ['API']],
        )
        const newId = ins[0].id
        return ok({
          id: newId,
          url: urlFor(newId),
          forked_from: id,
          warning:
            `Diagram ${id} is more than 24h old, so your edit was applied to a NEW diagram (${newId}) and the ` +
            `original was left untouched. If you meant to change the original in place, call update_system_design ` +
            `again with the same id plus a "reason" explaining the change.`,
        })
      }

      const { rows } = await db.query(
        `UPDATE system_designs SET
           title = COALESCE($2, title),
           nodes = COALESCE($3::jsonb, nodes),
           edges = COALESCE($4::jsonb, edges),
           update_reason = COALESCE($5, update_reason),
           updated_at = now()
         WHERE id = $1 AND user_id = $6 AND deleted_at IS NULL RETURNING id`,
        [id, title?.trim() ?? null, nextNodes, nextEdges, reason?.trim() ?? null, owner()],
      )
      if (!rows.length) return fail(`No owned diagram with id ${id}`)
      return ok({
        id,
        url: urlFor(id),
        updated: { title: title != null, nodes: nodes != null, edges: edges != null },
        ...(row.stale ? { edited_in_place: true, reason: reason.trim() } : {}),
      })
    } catch (e) { return fail(`update failed: ${e.message}`) }
  },
)

// ── Delete / restore ────────────────────────────────────────────────────────
// Delete is SOFT: the row is stamped deleted_at and drops out of every list,
// gallery and shared link, but it is kept. Cleaning up a batch of duplicates is
// therefore always reversible, which is the whole point of doing it in bulk.
server.registerTool(
  'delete_system_design',
  {
    title: 'Delete system design',
    description:
      'Move a diagram to trash by id. This is a soft delete - it disappears from the gallery, the demo list and any ' +
      'shared link, but the row is kept and restore_system_design can bring it back. Safe for cleaning up duplicates.',
    inputSchema: {
      id: z.string().describe('The diagram id to move to trash'),
      reason: z.string().optional().describe('Why it is being removed, e.g. "duplicate of v2.2". Recorded on the row.'),
    },
  },
  async ({ id, reason }) => {
    try {
      const { rows } = await db.query(
        `UPDATE system_designs SET deleted_at = now(), update_reason = COALESCE($3, update_reason)
         WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id, title`,
        [id, owner(), reason?.trim() ?? null],
      )
      if (!rows.length) return fail(`No owned, un-trashed diagram with id ${id}`)
      return ok({ trashed: id, title: rows[0].title, recoverable: true, restore_with: 'restore_system_design' })
    } catch (e) { return fail(`delete failed: ${e.message}`) }
  },
)

server.registerTool(
  'restore_system_design',
  {
    title: 'Restore system design',
    description: 'Bring a trashed diagram back by id. Call list_trash to see what is in there.',
    inputSchema: { id: z.string().describe('The diagram id to restore from trash') },
  },
  async ({ id }) => {
    try {
      const { rows } = await db.query(
        'UPDATE system_designs SET deleted_at = NULL WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING id, title',
        [id, owner()],
      )
      if (!rows.length) return fail(`No trashed diagram with id ${id}`)
      return ok({ restored: id, title: rows[0].title, url: urlFor(id) })
    } catch (e) { return fail(`restore failed: ${e.message}`) }
  },
)

server.registerTool(
  'purge_system_design',
  {
    title: 'Purge system design (permanent)',
    description:
      'PERMANENTLY delete a diagram that is already in trash. This cannot be undone. A live diagram must be moved to ' +
      'trash with delete_system_design first, so destroying anything always takes two deliberate steps.',
    inputSchema: { id: z.string().describe('The id of a TRASHED diagram to destroy permanently') },
  },
  async ({ id }) => {
    try {
      const { rowCount } = await db.query(
        'DELETE FROM system_designs WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL',
        [id, owner()],
      )
      if (!rowCount) return fail(`No TRASHED diagram with id ${id} - call delete_system_design first, or list_trash to check`)
      return ok({ purged: id, permanent: true })
    } catch (e) { return fail(`purge failed: ${e.message}`) }
  },
)

server.registerTool(
  'list_trash',
  {
    title: 'List trashed system designs',
    description: "Everything the owner has moved to trash, newest first, with the id restore_system_design needs.",
    inputSchema: {},
  },
  async () => {
    try {
      const { rows } = await db.query(
        `SELECT id, title, slug, deleted_at, update_reason,
                jsonb_array_length(nodes) AS nodes, jsonb_array_length(edges) AS edges
         FROM system_designs WHERE user_id = $1 AND deleted_at IS NOT NULL
         ORDER BY deleted_at DESC LIMIT 200`,
        [owner()],
      )
      return ok({ count: rows.length, trashed: rows })
    } catch (e) { return fail(`list_trash failed: ${e.message}`) }
  },
)

// ── Catalog of valid node service keys ──────────────────────────────────────
server.registerTool(
  'list_services',
  {
    title: 'List services',
    description: 'List every valid node service key (the id a node must use) with its label. Use these ids when building nodes.',
    inputSchema: {},
  },
  async () => ok({
    count: Object.keys(SERVICES).length,
    services: Object.entries(SERVICES).map(([key, s]) => ({ key, label: s.label, sub: s.sub })),
  }),
)

// ── Machine-readable schema + example ───────────────────────────────────────
server.registerTool(
  'get_diagram_schema',
  {
    title: 'Get diagram schema',
    description: 'Explain the exact structure to create/update a diagram: field shapes, rules, and a complete example.',
    inputSchema: {},
  },
  async () => ok({
    rules: [
      'A diagram is { title, nodes, edges }.',
      'HARD REQUIREMENT: every node id MUST be a known service key from list_services (each has a logo). Unknown ids are REJECTED - no bare-letter nodes allowed.',
      'A service key can appear at most once per diagram (node ids are unique).',
      'Edges are directed { source, target, label? } using node ids; order them in execution/flow order.',
      'Node positions (x,y) are optional - the app auto-layouts on open.',
    ],
    example: {
      title: 'URL Shortener - Tier 1',
      nodes: [{ id: 'user' }, { id: 'cloudfront' }, { id: 'apigw' }, { id: 'lambda' }, { id: 'dynamo' }],
      edges: [
        { source: 'user', target: 'cloudfront', label: 'GET /abc' },
        { source: 'cloudfront', target: 'apigw', label: 'miss' },
        { source: 'apigw', target: 'lambda', label: 'invoke' },
        { source: 'lambda', target: 'dynamo', label: 'read/write' },
      ],
    },
  }),
)

const transport = new StdioServerTransport()
await server.connect(transport)
// stderr only - stdout is the MCP transport channel.
console.error('system-design MCP server running on stdio')
