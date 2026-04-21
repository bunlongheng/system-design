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

## Environment Variables

| Variable | Description |
|----------|-------------|
| `JIRA_EMAIL` | Atlassian account email for JIRA API auth |
| `JIRA_TOKEN` | Atlassian API token for JIRA API auth |

---

Built by [Bunlong Heng](https://www.bunlongheng.com) | [GitHub](https://github.com/bunlongheng/system-design)
