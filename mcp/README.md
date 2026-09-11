# System Design MCP server

Lets any MCP-capable agent (Claude Code, Claude Desktop, etc.) work with the
System Design app: discover how many diagrams exist, learn the exact structure
to build one, and create / read / update / trash / restore diagrams. It talks
straight to the same Postgres the web app uses through the app's own `lib/`
layer, so anything an agent creates shows up in the app (and on prod)
immediately. Speaks MCP over stdio; logs go to stderr only.

## Tools

| Tool | Params | Returns |
|------|--------|---------|
| `list_system_designs` | none | `{ count, designs: [{ id, title, slug, nodes, edges, created_at, url }] }` - node/edge counts, newest first, max 200, trash excluded |
| `get_system_design` | `id` | `{ id, title, slug, nodes, edges, created_at, url }` - the full structure the app renders. Error if the id is unknown or trashed |
| `create_system_design` | `title`, `nodes[]`, `edges[]` (default `[]`), `public?` (default `true`) | `{ id, url, share_url, visibility, share_note?, layout?, warning?, probably_update? }` |
| `update_system_design` | `id`, `reason?`, `title?`, `nodes?`, `edges?`, `public?` | `{ id, url, share_url, visibility, updated: { title, nodes, edges, public }, layout?, reason? }` |
| `delete_system_design` | `id`, `reason?` | `{ trashed, title, recoverable: true, restore_with: "restore_system_design" }` |
| `restore_system_design` | `id` | `{ restored, title, url }` |
| `purge_system_design` | `id` (must already be trashed) | `{ purged, permanent: true }` |
| `list_trash` | none | `{ count, trashed: [{ id, title, slug, deleted_at, update_reason, nodes, edges }] }` - newest first, max 200 |
| `list_services` | none | `{ count, services: [{ key, label, sub }] }` - every valid catalog id |
| `get_diagram_schema` | none | `{ rules, example }` - field shapes, rules and a complete example with notes |

`url` is `<APP_URL>/?id=<uuid>`. `share_url` is `<APP_URL>/demo?name=<slug>`,
the link to hand to people. `visibility` is `"public"` or `"private"`.

### Node and edge shapes

```json
{
  "title": "URL Shortener - Tier 1",
  "nodes": [
    { "id": "user" },
    { "id": "cloudfront", "note": "Edge cache. A hit answers here and never reaches the API." },
    { "id": "apigw" },
    { "id": "lambda", "note": "Looks the short code up and 302s to the long URL." },
    { "id": "dynamo" }
  ],
  "edges": [
    { "source": "user", "target": "cloudfront", "label": "GET /abc" },
    { "source": "cloudfront", "target": "apigw", "label": "miss" },
    { "source": "apigw", "target": "lambda", "label": "invoke" },
    { "source": "lambda", "target": "dynamo", "label": "read/write" }
  ],
  "public": true
}
```

A node is `{ id, x?, y?, icon?, label?, sub?, color?, note? }`:

- `id` - a service key from `list_services` (e.g. `user`, `apigw`, `lambda`, `dynamo`, `kafka`, `redis`, `s3`), or any unique id when bringing your own icon. A key appears at most once per diagram.
- `icon` - bring-your-own logo: a remote `https` image URL, a `data:image/(png|jpeg|svg+xml|webp|gif)` URI with a real `;base64,` or `,` boundary, or a same-origin image path such as `/brand/foo.svg` (never protocol-relative `//host`). A remote URL is fetched once (https only, no redirects, `image/*`, max 24KB, 5s, private hosts refused, raster logos at least 96px) and inlined so the diagram stays self-contained. If it cannot be fetched the call fails and names the node. An inline `data:` icon is capped at 24KB.
- `label` - display name, required with a custom icon. `sub` - small subtitle. `color` - 6-digit brand hex (`#FF7A59`) for the border and tint; anything else is dropped because it lands in SVG attributes.
- `note` - plain text, max 400 chars, 1-2 sentences on what that step does. It renders under the card, bottom-left, in the app, on every shared link, in the SVG and on the share card. Set it on create, or later with `update_system_design` by sending the full `nodes` list with `note` on the ones that need it.
- `x` / `y` - optional. Omit them and the canvas lays the design out left-to-right, which is the wanted look.

Edges are directed `{ source, target, label? }` using node ids, in flow order. Each edge becomes a numbered step in the app.

### Rules the server enforces

- **Logo gate** - every node must render a real logo. A node that is neither a catalog service nor carries a valid `icon` is rejected on create and update, and the error lists the unresolved ids and points at `list_services`. No bare-letter placeholders. The gate is `lib/validate-design.js`, the same policy the HTTP API and AI generate use, so it also enforces the caps: max 100 nodes, max 300 edges, max 24KB per inline icon.
- **Start-left rule** - a diagram starts on the LEFT and reads left-to-right, never from the bottom, never backward. It is only judged when every node has coordinates: if the start node (the first edge's source, else the first node with no incoming edge) is not in the leftmost column, or sits at the bottom of a layout with vertical spread, all positions are dropped and the canvas auto-lays it out. The response carries a `layout` warning saying why.
- **Born arranged** - a new diagram is stored with the same layout the app's Arrange button produces, so it never opens crammed.
- **Version-spam guard** - if another diagram created in the last 7 days shares this title's base (ignoring a v2 / v2.1 suffix), the row is still created but the response adds `warning` and `probably_update: <id>` pointing at the one you probably meant to edit.
- Rows created here are tagged `["MCP"]` and owned by `OWNER_USER_ID`.

### Visibility

`public` on `create_system_design` defaults to `true`: anyone with `share_url`
can open it and the link unfurls with the diagram itself in Slack and iMessage.
`public: false` keeps it private - recipients get a 404 and the generic site
card, and the response includes `share_note` saying so. Flip it later with
`update_system_design { id, public: true }`; omit `public` on update to leave
visibility alone.

Note the HTTP API (`POST /api/ai/system-designs`) defaults the other way
(`is_public: false`).

### Update and reason

`update_system_design` works on a diagram of any age - backfilling and
correcting old work is what it is for, so always prefer it over creating a
"v2". Any of `title`, `nodes`, `edges`, `public` you send replaces that field;
omitted fields are unchanged. Sending `nodes` replaces the whole node list
(the logo gate and start-left rule run again), so include every node.

`reason` is optional on both `update_system_design` and
`delete_system_design`. When given it is trimmed and stored in the row's
`update_reason` column as a trail, and echoed back in the update response.
It is never required.

### Trash

`delete_system_design` is a soft delete: the row is stamped `deleted_at` and
disappears from the gallery, the demo list and every shared link, but it is
kept. `list_trash` shows what is there, `restore_system_design` brings one
back, and `purge_system_design` destroys one permanently - and only one that
is already in trash, so destroying anything always takes 2 deliberate steps.
`update_system_design` and `get_system_design` do not see trashed rows.

## Requirements

`mcp/load-env.mjs` loads the repo `.env` by absolute path before anything
else, so the working directory the agent launches from does not matter.

| Variable | Required | Purpose |
|----------|----------|---------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `OWNER_USER_ID` | Yes | Owner uuid; every tool reads and writes only this owner's rows. Missing means every call fails |
| `SYSTEM_DESIGNS_APP_URL` | No | Base for `url` / `share_url`. Defaults to `https://system-design-bheng.vercel.app` |
| `DATABASE_SSL` | No | `"true"` for a remote Postgres with a self-signed cert |

Run `npm install` once so `@modelcontextprotocol/sdk` is present.

## Connect it

**Claude Code (this repo):** already wired via `.mcp.json` at the repo root,
discovered automatically when you run Claude Code here:

```json
{
  "mcpServers": {
    "system-design": {
      "command": "node",
      "args": ["mcp/server.mjs"]
    }
  }
}
```

Or add it from anywhere:

```bash
claude mcp add system-design -- node /absolute/path/to/system-design/mcp/server.mjs
```

**Claude Desktop:** add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "system-design": {
      "command": "node",
      "args": ["/absolute/path/to/system-design/mcp/server.mjs"]
    }
  }
}
```

**Run it standalone:** `npm run mcp`.

Once connected you can just say: *"create a system design for a URL shortener"*
and the agent will call `list_services` / `get_diagram_schema` to learn the
shape, then `create_system_design`, and hand you back the `share_url`.
