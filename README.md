<div align="center">

Interactive AWS/GCP system design diagram tool with React Flow, dagre auto-layout, and an AI-callable artifact API for programmatic diagram creation.

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Made with React](https://img.shields.io/badge/made%20with-React-61DAFB.svg)

## What it is

A Vite + React single-page app that renders interactive AWS and GCP system design diagrams using React Flow, with dagre handling automatic graph layout. Paste a Mermaid diagram to render it, or drag components onto the canvas by hand. Beyond the SPA, the app exposes a small render-only HTTP API so diagrams can be created programmatically and shared as a link - backed by a shared PostgreSQL database and deployed as Vercel serverless functions.

Interactive AWS / distributed-system architecture diagrams - paste a Mermaid flowchart, watch it auto-layout on a React Flow canvas with real service icons.

| Layer | Technology |
|-------|-----------|
| Bundler | Vite 8 |
| UI | React 19 + React Flow (`@xyflow/react`) + dagre (`@dagrejs/dagre`) |
| Language | JavaScript (JSX) |
| API | Node + Express (local/CI), Vercel serverless functions (prod) |
| Database | PostgreSQL (`pg`) |
| AI | Anthropic SDK (admin-only diagram generation) |
| Hosting | Vercel |
| Tests | Vitest (unit) + Playwright (e2e) |
| Lint | ESLint |

## Architecture

The browser SPA is a static build served by Vercel. Requests to `/api/*` hit Vercel serverless functions in `api/`, which are thin wrappers around the shared handlers in `lib/handlers/`. Those handlers talk to a PostgreSQL database (`system_designs` table). Locally and in CI, `serve.mjs` runs the exact same handlers behind Express so `npm run start` is a prod-like single process.

```
Browser (React SPA)
    |
    | static assets           /api/* requests
    v                             v
Vercel static hosting     Vercel serverless functions (api/)
                                   |
                                   v
                           lib/handlers/* (shared logic)
                                   |
                                   v
                              PostgreSQL (pg)

Local/CI equivalent: serve.mjs (Express) serves dist/ + mounts
the same lib/handlers/* on the same routes, listening on :4321.
```

## Features

- Interactive AWS and GCP system-architecture diagrams
- Paste-to-render: parse a Mermaid diagram straight into the canvas
- Auto-layout via dagre
- Drag-and-drop component placement
- Library of AWS/GCP service icons (compute, storage, messaging, security, CI/CD, observability)
- AI-callable artifact API for programmatic diagram creation

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
| `POST /api/ai/generate` | Owner/local **only** | Prompt -> Claude. The Bearer key is **rejected** (`authorizeOwner(req,{allowBearer:false})`) so public callers can never spend Anthropic credits. |
| `GET /api/system-designs` | Public read | The owner's saved designs, newest first (max 60) - the gallery feed. |
| `GET /api/system-designs/:id` | Public read | Returns a saved design's JSON (what the returned URL renders). |
| `DELETE /api/system-designs/:id` | Bearer-gated | Removes an artifact. |
| `GET /api/health` | Public | `200`/`503` liveness for the prod monitor (API secret + owner + DB). |

## How it works

```
system-design/
  src/
    App.jsx           # Main app - gallery + detail canvas, diagram rendering
    services.js        # AWS/GCP service icon catalog + lookup helpers
    components/         # Extracted UI (ImportFormatsModal, ...)
    main.jsx           # React entry point
    parseMermaid.js    # Mermaid -> React Flow node/edge parser
    index.css           # Global styles
    data/
      diagram.json      # Default/sample diagram data
  api/                  # Vercel serverless functions (thin wrappers)
    health.js
    ai/
      system-designs.js
      generate.js
    system-designs/
      [id].js
  lib/
    db.js               # PostgreSQL client (pg)
    auth-owner.js        # Bearer + owner auth helpers
    is-local.js          # Local/LAN detection for dev bypass
    env.js               # Required-env validation (fails prod build if missing)
    slugs.js             # Unique slug generation
    wrap.js               # Error-wrapping middleware
    handlers/             # Shared handler logic (imported by api/ and serve.mjs)
      create-system-design.js
      generate.js
      health.js
      system-design-by-id.js
  db/
    migrate.mjs           # Migration runner
    migrations/
      20260812000000_system_designs.sql
  serve.mjs               # Express server - local/CI prod-like API + static SPA
  tests/
    unit/                 # Vitest unit tests
    e2e/                  # Playwright e2e tests
  .github/
    workflows/             # CI + prod-monitor workflows
```

## Getting Started

```bash
git clone https://github.com/bunlongheng/system-design.git
cd system-design
npm install
cp .env.example .env   # fill in the variables below
npm run migrate         # create the system_designs table
```

Local development (two processes):

```bash
npm run dev   # Vite dev server (SPA) on http://localhost:5173
npm run api   # Express API server on http://localhost:4321
```

Prod-like single process:

```bash
npm run build
npm run start   # serves dist/ + API together on http://localhost:4321
```

Tests:

```bash
npm test         # Vitest unit tests
npm run test:e2e # Playwright e2e tests
```

Paste any `graph LR` or `graph TD` Mermaid text into the page to render it - no build step or config required.

| Variable | Description |
|----------|-------------|
| `SYSTEM_DESIGNS_API_SECRET` | Bearer secret for the public artifact API. Server-only; never `NEXT_PUBLIC_*`/`VITE_*`. |
| `DATABASE_URL` / `DATABASE_SSL` | Postgres connection for the `system_designs` table. |
| `OWNER_USER_ID` | UUID that owns API-created artifacts. |
| `SYSTEM_DESIGNS_APP_URL` | Base URL used to build the returned artifact URL. |
| `ANTHROPIC_API_KEY` | Admin-only, used by `POST /api/ai/generate`. |
| `LOCAL_DEV` | Dev-only auth bypass. Never set in production. |

## License

MIT - see [LICENSE](./LICENSE).

[MIT](LICENSE) (c) Bunlong Heng
