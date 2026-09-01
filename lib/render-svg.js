// Server-side SVG renderer: turns a stored diagram ({nodes, edges}) into a
// self-contained SVG (dagre layout + inlined logos) so a remote agent can POST a
// diagram and get back an SVG string to embed in docs - no browser needed.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { findService } from "../src/services.js";
import { layoutElements } from "../src/layout.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, "..", "public");

const NODE_W = 190, NODE_H = 120; // dagre box (matches layout.js)
const CW = 158, CH = 94;          // drawn card size

// Datastores that can be the single "Destination" (source of truth), same order
// as the app.
const SOURCE_OF_TRUTH = [
  "dynamo", "dynamodb", "rds", "postgres", "mysql", "aurora", "spanner", "cockroach",
  "cassandra", "keyspaces", "mongodb", "bigtable", "s3", "storage",
  "redis", "elasticache", "memcached", "opensearch", "elasticsearch",
];

const esc = (s) => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Blend a #hex with white so the node fill is an OPAQUE light tint (edges drawn
// underneath never show through).
function tint(hex, a = 0.1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return "#f5f6f7";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const bl = (c) => Math.round(255 * (1 - a) + c * a);
  return `rgb(${bl(r)},${bl(g)},${bl(b)})`;
}

const iconCache = new Map();
function inlineIcon(icon) {
  if (!icon) return null;
  if (icon.startsWith("data:")) return icon;
  if (!icon.startsWith("/")) return null; // https icons are inlined at create time
  if (iconCache.has(icon)) return iconCache.get(icon);
  try {
    const buf = readFileSync(path.join(PUBLIC, icon.replace(/^\//, "")));
    const ext = icon.split(".").pop().toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : ext === "webp" ? "image/webp" : "image/png";
    const uri = `data:${mime};base64,${buf.toString("base64")}`;
    iconCache.set(icon, uri);
    return uri;
  } catch {
    return null;
  }
}

function pill(cx, cy, text, color) {
  const w = text.length * 6.2 + 30;
  return `<g transform="translate(${cx - w / 2},${cy - 13})">
    <rect width="${w}" height="26" rx="13" fill="#ffffff" stroke="${color}" stroke-width="1.5"/>
    <circle cx="16" cy="13" r="7" fill="${color}"/>
    <text x="${w / 2 + 6}" y="17" text-anchor="middle" font-size="11" font-weight="800" fill="${color}">${esc(text)}</text>
  </g>`;
}

export function renderDiagramSvg(rawNodes, rawEdges) {
  const nodes0 = (rawNodes || []).map((n) => ({ id: n.id, icon: n.icon, label: n.label, color: n.color, sub: n.sub }));
  const edges = rawEdges || [];
  if (!nodes0.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100" width="200" height="100"><rect width="200" height="100" fill="#fff"/></svg>`;
  }
  const laid = layoutElements(nodes0, edges);
  const byId = {};
  const placed = laid.map((n) => {
    const cx = n.position.x + NODE_W / 2, cy = n.position.y + NODE_H / 2;
    const svc = findService(n);
    const p = { id: n.id, cx, cy, color: svc.color || "#6b7280", label: svc.label || n.id, sub: svc.sub || "", icon: inlineIcon(svc.icon) };
    byId[n.id] = p;
    return p;
  });

  const PAD = 56;
  const minX = Math.min(...placed.map((p) => p.cx - CW / 2)) - PAD - 150;
  const maxX = Math.max(...placed.map((p) => p.cx + CW / 2)) + PAD + 170;
  const minY = Math.min(...placed.map((p) => p.cy - CH / 2)) - PAD;
  const maxY = Math.max(...placed.map((p) => p.cy + CH / 2)) + PAD;
  const W = Math.round(maxX - minX), H = Math.round(maxY - minY);

  // Start = source of step 1 (else no-incoming, else first). Destination = single datastore.
  const hasIncoming = new Set(edges.map((e) => e.target));
  let startId = edges[0] && byId[edges[0].source] ? edges[0].source : (placed.find((p) => !hasIncoming.has(p.id)) || placed[0]).id;
  const endId = SOURCE_OF_TRUTH.find((id) => byId[id] && id !== startId) || null;

  let edgesSvg = "", labelsSvg = "";
  for (const e of edges) {
    const s = byId[e.source], t = byId[e.target];
    if (!s || !t) continue;
    edgesSvg += `<line x1="${s.cx.toFixed(1)}" y1="${s.cy.toFixed(1)}" x2="${t.cx.toFixed(1)}" y2="${t.cy.toFixed(1)}" stroke="${s.color}" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.7"/>`;
    if (e.label) {
      const mx = (s.cx + t.cx) / 2, my = (s.cy + t.cy) / 2, w = e.label.length * 5.6 + 16;
      labelsSvg += `<g transform="translate(${(mx - w / 2).toFixed(1)},${(my - 9).toFixed(1)})"><rect width="${w.toFixed(1)}" height="18" rx="9" fill="#1c1e21"/><text x="${(w / 2).toFixed(1)}" y="12.5" text-anchor="middle" font-size="9" font-weight="700" fill="#fff">${esc(e.label)}</text></g>`;
    }
  }

  let nodesSvg = "";
  for (const p of placed) {
    const x = (p.cx - CW / 2).toFixed(1), y = (p.cy - CH / 2).toFixed(1);
    nodesSvg += `<g transform="translate(${x},${y})">
      <rect width="${CW}" height="${CH}" fill="#ffffff"/>
      <rect width="${CW}" height="${CH}" fill="${tint(p.color, 0.08)}" stroke="${p.color}" stroke-width="1"/>
      ${p.icon ? `<image xlink:href="${p.icon}" href="${p.icon}" x="${(CW - 46) / 2}" y="11" width="46" height="46" preserveAspectRatio="xMidYMid meet"/>` : ""}
      <text x="${CW / 2}" y="73" text-anchor="middle" font-size="12" font-weight="700" fill="#111827">${esc(p.label)}</text>
      ${p.sub ? `<text x="${CW / 2}" y="86" text-anchor="middle" font-size="9.5" fill="#6b7280">${esc(p.sub)}</text>` : ""}
    </g>`;
  }

  let markers = "";
  const s = byId[startId];
  if (s) {
    const mx = s.cx - CW / 2 - 96, my = s.cy;
    markers += `<line x1="${(mx + 66).toFixed(1)}" y1="${my.toFixed(1)}" x2="${(s.cx - CW / 2).toFixed(1)}" y2="${my.toFixed(1)}" stroke="#16a34a" stroke-width="1.5" stroke-dasharray="5 4"/>` + pill(mx, my, "Start here", "#16a34a");
  }
  const en = endId && byId[endId];
  if (en) {
    const mx = en.cx + CW / 2 + 90, my = en.cy;
    markers += `<line x1="${(en.cx + CW / 2).toFixed(1)}" y1="${my.toFixed(1)}" x2="${(mx - 66).toFixed(1)}" y2="${my.toFixed(1)}" stroke="#dc2626" stroke-width="1.5" stroke-dasharray="5 4"/>` + pill(mx, my, "Destination", "#dc2626");
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${minX.toFixed(1)} ${minY.toFixed(1)} ${W} ${H}" width="${W}" height="${H}" font-family="Inter, -apple-system, Arial, sans-serif"><rect x="${minX.toFixed(1)}" y="${minY.toFixed(1)}" width="${W}" height="${H}" fill="#ffffff"/>${edgesSvg}${markers}${nodesSvg}${labelsSvg}</svg>`;
}
