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
import { ownerId } from '../lib/auth-owner.js'
import { SERVICES } from '../src/services.js'

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
const unknownServices = nodes => [...new Set(nodes.map(n => n.id).filter(id => !SERVICES[id]?.icon))]
// HARD GATE: refuse nodes that have no logo (unknown service key). Returns an
// error result to send back, or null if every node is a real service.
const logoGate = nodes => {
  const missing = unknownServices(nodes)
  return missing.length
    ? fail(`Rejected: every node must use a known service that has a logo. No logo for: ${missing.join(', ')}. Call list_services for valid keys, then pick real services.`)
    : null
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
        'SELECT id, title, slug, nodes, edges, created_at FROM system_designs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200',
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
      const { rows } = await db.query('SELECT id, title, slug, nodes, edges FROM system_designs WHERE id = $1', [id])
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
    description: "Create a new diagram. Provide a title, nodes (each id must be a known service key - call list_services), and edges connecting node ids. Positions are optional (the app auto-layouts). Returns the new id and URL.",
    inputSchema: {
      title: z.string().describe('Descriptive title, e.g. "URL Shortener - Tier 1"'),
      nodes: z.array(z.object({
        id: z.string().describe('A known service key, e.g. "user","apigw","lambda","ses","dynamo"'),
        x: z.number().optional(),
        y: z.number().optional(),
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
      const o = owner()
      const slug = await uniqueSystemDesignSlug(o, title)
      const storedNodes = toStoredNodes(nodes)
      const storedEdges = toStoredEdges(edges)
      const { rows } = await db.query(
        'INSERT INTO system_designs (user_id, title, slug, nodes, edges, type, tags) VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7::text[]) RETURNING id',
        [o, title.trim(), slug, JSON.stringify(storedNodes), JSON.stringify(storedEdges), 'system-design', ['MCP']],
      )
      const id = rows[0].id
      return ok({ id, url: urlFor(id) })
    } catch (e) { return fail(`create failed: ${e.message}`) }
  },
)

// ── Update (modify title / nodes / edges) ───────────────────────────────────
server.registerTool(
  'update_system_design',
  {
    title: 'Update system design',
    description: 'Modify an existing diagram by id. Any of title, nodes, or edges you provide replaces that field; omitted fields are left unchanged.',
    inputSchema: {
      id: z.string().describe('The diagram id to update'),
      title: z.string().optional(),
      nodes: z.array(z.object({ id: z.string(), x: z.number().optional(), y: z.number().optional() })).optional(),
      edges: z.array(z.object({ source: z.string(), target: z.string(), label: z.string().optional() })).optional(),
    },
  },
  async ({ id, title, nodes, edges }) => {
    try {
      if (nodes) { const gate = logoGate(nodes); if (gate) return gate }
      const { rows } = await db.query(
        `UPDATE system_designs SET
           title = COALESCE($2, title),
           nodes = COALESCE($3::jsonb, nodes),
           edges = COALESCE($4::jsonb, edges)
         WHERE id = $1 AND user_id = $5 RETURNING id`,
        [
          id,
          title?.trim() ?? null,
          nodes ? JSON.stringify(toStoredNodes(nodes)) : null,
          edges ? JSON.stringify(toStoredEdges(edges)) : null,
          owner(),
        ],
      )
      if (!rows.length) return fail(`No owned diagram with id ${id}`)
      return ok({ id, url: urlFor(id), updated: { title: title != null, nodes: nodes != null, edges: edges != null } })
    } catch (e) { return fail(`update failed: ${e.message}`) }
  },
)

// ── Delete ──────────────────────────────────────────────────────────────────
server.registerTool(
  'delete_system_design',
  {
    title: 'Delete system design',
    description: 'Permanently delete a diagram by id.',
    inputSchema: { id: z.string().describe('The diagram id to delete') },
  },
  async ({ id }) => {
    try {
      const { rowCount } = await db.query('DELETE FROM system_designs WHERE id = $1 AND user_id = $2', [id, owner()])
      if (!rowCount) return fail(`No owned diagram with id ${id}`)
      return ok({ deleted: id })
    } catch (e) { return fail(`delete failed: ${e.message}`) }
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
