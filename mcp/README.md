# System Design MCP server

Lets any MCP-capable agent (Claude Code, Claude Desktop, etc.) work with the
System Design app: discover how many diagrams exist, learn the exact structure
to build one, and create / read / update / delete diagrams. It talks straight to
the same Postgres the web app uses, so anything an agent creates shows up in the
app (and on prod) immediately.

## Tools

| Tool | What it does |
|------|--------------|
| `list_system_designs` | Count + list every saved diagram (id, title, node/edge counts, URL) |
| `get_system_design` | Full nodes + edges for one diagram by id |
| `create_system_design` | Create a diagram from `{ title, nodes, edges }` |
| `update_system_design` | Modify a diagram's title / nodes / edges by id |
| `delete_system_design` | Delete a diagram by id |
| `list_services` | Every valid node service key (the id a node must use) + its label |
| `get_diagram_schema` | The exact structure, rules, and a complete example |

## Structure an agent provides

```json
{
  "title": "URL Shortener - Tier 1",
  "nodes": [{ "id": "user" }, { "id": "cloudfront" }, { "id": "apigw" }, { "id": "lambda" }, { "id": "dynamo" }],
  "edges": [
    { "source": "user", "target": "cloudfront", "label": "GET /abc" },
    { "source": "cloudfront", "target": "apigw", "label": "miss" },
    { "source": "apigw", "target": "lambda", "label": "invoke" },
    { "source": "lambda", "target": "dynamo", "label": "read/write" }
  ]
}
```

- Each node `id` must be a service key from `list_services` (e.g. `user`, `apigw`, `lambda`, `ses`, `dynamo`, `kafka`, `redis`, `s3`). A key can appear once per diagram.
- Edges are directed `{ source, target, label? }` using node ids; order them in flow order.
- A node may carry a plain-text `note` (max 400 chars): 1-2 sentences on what that step does. It renders under the card, bottom-left, in the app, on every shared link and in the SVG. Set it on create, or later with `update_system_design` (send the full `nodes` list with `note` on the ones that need it).
- Node `x`/`y` are optional - the app auto-layouts on open.
- `public` (default true on create) controls who can open the link. Hand people the `share_url` from the response (`/demo?name=<slug>`): it opens for anyone and unfurls with the diagram itself in Slack and iMessage. A private diagram 404s for recipients and previews as the generic site card - flip it with `update_system_design { public: true }`.

## Requirements

Reads `DATABASE_URL` and `OWNER_USER_ID` from the repo `.env` (loaded via an
absolute path, so the working directory does not matter). Run `npm install` once
so the `@modelcontextprotocol/sdk` dependency is present.

## Connect it

**Claude Code (this repo):** already wired via `.mcp.json` at the repo root - it
is discovered automatically when you run Claude Code here. Or add it anywhere:

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

**Run it standalone:** `npm run mcp` (speaks MCP over stdio).

Once connected you can just say: *"create a system design for a URL shortener"*
and the agent will call `list_services` / `get_diagram_schema` to learn the shape,
then `create_system_design`, and hand you back the URL.
