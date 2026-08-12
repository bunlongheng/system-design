# System Design - Architecture Diagram Tool

Interactive system design and AWS architecture diagram tool with auto-layout, JIRA integration, and drag-and-drop component placement.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Bundler | Vite (ES modules) |
| UI | React 19.2.4, Tailwind CSS |
| Language | TypeScript |
| Graph Editor | @xyflow/react |
| Layout Engine | @dagrejs/dagre |
| Extras | canvas-confetti |
| Database | None |
| Port | 3006 |

## Architecture

Vite-powered React SPA with a visual flow editor. Dagre handles automatic graph layout so nodes arrange themselves cleanly. A Vite dev proxy forwards JIRA API requests to Atlassian using Basic auth, enabling system design data to be pulled directly from JIRA tickets.

```
Browser --> React Flow Canvas --> Dagre Layout
                |
                +--> Vite Proxy --> Atlassian JIRA API (Basic Auth)
```

## Features

- Interactive AWS and distributed system architecture diagrams
- Auto-layout with Dagre algorithm
- JIRA integration - pull system design data from Atlassian
- Drag-and-drop component placement
- Multiple infrastructure icons (server, database, load balancer, etc.)
- Layer-based architecture views
- Confetti celebrations on milestones

## Project Structure

```
system-design/
  src/
    components/     # React UI components, custom nodes
    App.tsx         # Main application entry
  public/           # Static assets, infrastructure icons
  vite.config.ts    # Vite config with JIRA proxy
  tailwind.config.ts
```

## Scripts

```bash
npm run dev        # Start dev server on port 3006
npm run build      # Production build
npm run preview    # Preview production build
```

## AI-callable artifact API

There is exactly **one** publicly documented way to create a system design programmatically. It is **render-only**: the caller supplies the finished structure, the API persists it and returns its URL. It makes **no model call** and spends **zero Anthropic dollars**.

### `POST /api/ai/system-designs` (public, render-only)

```bash
curl -X POST https://system-design-bheng.vercel.app/api/ai/system-designs \
  -H "Authorization: Bearer $SYSTEM_DESIGNS_API_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Netflix System Design",
    "type": "system-design",
    "nodes": [
      { "id": "user",       "position": { "x": 40,  "y": 200 } },
      { "id": "cloudfront", "position": { "x": 260, "y": 200 } },
      { "id": "apigw",      "position": { "x": 480, "y": 200 } },
      { "id": "lambda",     "position": { "x": 700, "y": 200 } },
      { "id": "dynamo",     "position": { "x": 920, "y": 200 } }
    ],
    "edges": [
      { "id": "e1", "source": "user",       "target": "cloudfront", "label": "HTTPS", "animated": true },
      { "id": "e2", "source": "cloudfront", "target": "apigw",      "label": "origin" },
      { "id": "e3", "source": "apigw",      "target": "lambda",     "label": "invoke" },
      { "id": "e4", "source": "lambda",     "target": "dynamo",     "label": "read/write" }
    ]
  }'
# -> 201 { "url": "https://system-design-bheng.vercel.app/?id=<uuid>" }
```

- **Auth:** `Bearer $SYSTEM_DESIGNS_API_SECRET` (constant-time compare). A bad/missing token returns `401`.
- **Body:** `title` (string, required), `nodes` (non-empty `[{ id, position }]`, required), `edges` (`[{ source, target, label?, animated? }]`), `type` (`"system-design"` only). Bad input returns `400` with a `sample_request`.
- Each node `id` must be a known service key (e.g. `cloudfront`, `lambda`, `dynamo`, `s3`, `kinesis`, `sagemaker`, `waf`, `cognito`) so its AWS/GCP icon resolves.

### Internal / admin-only (NOT public)

| Route | Access | Notes |
|-------|--------|-------|
| `POST /api/ai/generate` | Owner/local **only** | Prompt → Claude. The Bearer key is **rejected** (`authorizeOwner(req,{allowBearer:false})`) so public callers can never spend Anthropic credits. |
| `GET /api/system-designs/:id` | Public read | Returns a saved design's JSON (what the returned URL renders). |
| `DELETE /api/system-designs/:id` | Bearer-gated | Removes an artifact. |
| `GET /api/health` | Public | `200`/`503` liveness for the prod monitor (API secret + owner + DB). |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `SYSTEM_DESIGNS_API_SECRET` | Bearer secret for the public artifact API. Server-only; never `NEXT_PUBLIC_*`/`VITE_*`. |
| `DATABASE_URL` / `DATABASE_SSL` | Postgres connection for the `system_designs` table. |
| `OWNER_USER_ID` | UUID that owns API-created artifacts. |
| `SYSTEM_DESIGNS_APP_URL` | Base URL used to build the returned artifact URL. |
| `ANTHROPIC_API_KEY` | Admin-only `POST /api/ai/generate`. |
| `LOCAL_DEV` | Dev-only auth bypass. Never set in production. |
| `JIRA_EMAIL` / `JIRA_TOKEN` | Atlassian account email + API token for the JIRA dev proxy. |

---

Built by [Bunlong Heng](https://www.bunlongheng.com) | [GitHub](https://github.com/bunlongheng/system-design)
