import db from "../db.js";
import { bearerOk, ownerId } from "../auth-owner.js";
import { uniqueSystemDesignSlug } from "../slugs.js";
import { rateLimit } from "../rate-limit.js";
import { SERVICES } from "../../src/services.js";
import { resolveNodeIcons } from "../resolve-icon.js";
import { renderDiagramSvg } from "../render-svg.js";

const APP_URL = process.env.SYSTEM_DESIGNS_APP_URL || "https://system-design-bheng.vercel.app";

// The single public, documented way to create an artifact. RENDER-ONLY:
// the caller supplies the finished React Flow structure ({ nodes, edges }); we
// persist and return its URL. Makes NO model call -> ZERO Anthropic spend.
const SAMPLE_BODY = {
  title: "Netflix System Design",
  type: "system-design",
  nodes: [
    { id: "user", position: { x: 40, y: 200 } },
    { id: "cloudfront", position: { x: 260, y: 200 } },
    { id: "apigw", position: { x: 480, y: 200 } },
    { id: "lambda", position: { x: 700, y: 200 } },
    { id: "dynamo", position: { x: 920, y: 200 } },
  ],
  edges: [
    { id: "e1", source: "user", target: "cloudfront", label: "HTTPS", animated: true },
    { id: "e2", source: "cloudfront", target: "apigw", label: "origin" },
    { id: "e3", source: "apigw", target: "lambda", label: "invoke" },
    { id: "e4", source: "lambda", target: "dynamo", label: "read/write" },
  ],
};

function bad(res, error, extra = {}) {
  return res.status(400).json({
    error,
    supported_type: "system-design ONLY (React Flow { nodes, edges } structure)",
    required_fields: {
      title: 'string - a descriptive name (e.g. "Netflix System Design")',
      nodes: 'array - non-empty [{ id, position:{x,y} }]; id must match a known service (e.g. "cloudfront", "lambda", "dynamo", "s3", "kinesis")',
      edges: "array - [{ source, target, label?, animated? }] connecting node ids",
    },
    sample_request: {
      method: "POST",
      url: "/api/ai/system-designs",
      headers: {
        Authorization: "Bearer <SYSTEM_DESIGNS_API_SECRET>",
        "Content-Type": "application/json",
      },
      body: SAMPLE_BODY,
    },
    ...extra,
  });
}

export default async function createSystemDesign(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  // ── Auth: Bearer secret ONLY (public render endpoint; no model call) ────────
  if (!process.env.SYSTEM_DESIGNS_API_SECRET) {
    return res.status(500).json({ error: "SYSTEM_DESIGNS_API_SECRET not configured" });
  }
  if (!bearerOk(req)) return res.status(401).json({ error: "Unauthorized" });

  const limited = rateLimit(req, { key: "create", limit: 60, windowMs: 60000 });
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const { title, nodes, edges = [], type = "system-design" } = body;

  // ── Validate: ONLY the system-design (React Flow) structure is accepted ─────
  if (type && type !== "system-design") return bad(res, `Unsupported type: "${type}".`);
  if (!title || typeof title !== "string" || !title.trim()) return bad(res, "Missing required field: title (string).");
  if (!Array.isArray(nodes) || nodes.length === 0) {
    return bad(res, "Missing required field: nodes (non-empty array of { id, position }).");
  }
  for (const n of nodes) {
    if (!n || typeof n.id !== "string" || !n.id.trim()) {
      return bad(res, 'Every node must be an object with a non-empty string "id" (a known service key).');
    }
  }
  // HARD GATE: every node must show a real logo - EITHER a known catalog service,
  // OR a bring-your-own icon on the node (a same-origin path like "/brand/foo.svg"
  // or a data:image/... URI). No bare letter fallbacks.
  const okCustomIcon = (ic) => typeof ic === "string" && (ic.startsWith("/") || ic.startsWith("https://") || /^data:image\/(png|jpeg|svg\+xml|webp|gif)[;,]/.test(ic));
  const invalid = nodes.filter((n) => !SERVICES[n.id]?.icon && !okCustomIcon(n.icon));
  if (invalid.length) {
    return bad(
      res,
      `Every node must render a real logo: use a known catalog service id, OR give the node a custom "icon" (a remote https URL, a data:image/... URI, or a same-origin path like "/brand/foo.svg") plus a "label". Unresolved: ${invalid.map((n) => n.id).join(", ")}.`,
      { unresolved: invalid.map((n) => n.id) },
    );
  }
  // Cap custom data-URI icons so a leaked key can't bloat the shared DB.
  const bigIcon = nodes.find((n) => typeof n.icon === "string" && n.icon.startsWith("data:") && n.icon.length > 24000);
  if (bigIcon) return bad(res, `Custom data: icon on node "${bigIcon.id}" is too large (max ~24KB). Optimize the SVG/PNG or host it under /brand and pass the path.`);
  if (!Array.isArray(edges)) return bad(res, 'Field "edges" must be an array of { source, target }.');
  for (const e of edges) {
    if (!e || typeof e.source !== "string" || typeof e.target !== "string") {
      return bad(res, 'Every edge must have string "source" and "target" node ids.');
    }
  }

  // Payload caps: the endpoint is public (Bearer-gated), so bound row size to
  // stop a leaked key from bloating the shared DB with oversized artifacts.
  if (title.length > 200) return bad(res, "title too long (max 200 characters).");
  if (nodes.length > 100) return bad(res, "too many nodes (max 100).");
  if (edges.length > 300) return bad(res, "too many edges (max 300).");

  const owner = ownerId();
  if (!owner) return res.status(500).json({ error: "OWNER_USER_ID not configured" });

  // Callers may omit positions (the app auto-layouts on open). Default them to a
  // simple grid so stored nodes ALWAYS have a valid position - a position-less
  // node otherwise crashes the gallery minimap.
  // Fetch any remote https icon URLs and inline them as data: URIs, so the stored
  // diagram is self-contained. Reject if a caller-supplied remote icon can't load.
  const { nodes: iconNodes, failed } = await resolveNodeIcons(nodes);
  if (failed.length) {
    return bad(res, `Could not fetch the remote icon for node(s): ${failed.join(", ")}. Use an https image URL that returns image/* under 24KB (no redirects), or inline a data:image/... URI.`, { icon_fetch_failed: failed });
  }

  const normalizedNodes = iconNodes.map((nd, i) => ({
    id: nd.id,
    position:
      nd.position && typeof nd.position.x === "number" && typeof nd.position.y === "number"
        ? nd.position
        : { x: 120 + (i % 6) * 220, y: 120 + Math.floor(i / 6) * 160 },
    // Optional bring-your-own-icon fields - stored only when present.
    ...(typeof nd.icon === "string" && nd.icon ? { icon: nd.icon } : {}),
    ...(typeof nd.label === "string" && nd.label ? { label: nd.label } : {}),
    ...(typeof nd.color === "string" && nd.color ? { color: nd.color } : {}),
    ...(typeof nd.sub === "string" && nd.sub ? { sub: nd.sub } : {}),
  }));

  // ── Insert (PARAMETERIZED only), owned by OWNER_USER_ID ─────────────────────
  // New diagrams are PRIVATE by default (is_public=false): /demo is auth-free, so
  // nothing should land there until the owner explicitly publishes it (PATCH
  // is_public). The column default is true only to keep the pre-existing showcase
  // demos visible.
  const slug = await uniqueSystemDesignSlug(owner, title);
  const { rows } = await db.query(
    "INSERT INTO system_designs (user_id, title, slug, nodes, edges, type, tags, is_public) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7::text[], false) RETURNING id",
    [owner, title.trim(), slug, JSON.stringify(normalizedNodes), JSON.stringify(edges), type, ["API"]],
  );
  if (rows.length === 0) return res.status(500).json({ error: "Insert failed" });

  const id = rows[0].id;
  const out = { id, url: `${APP_URL}/?id=${id}`, svg_url: `${APP_URL}/api/system-designs/${id}?format=svg` };
  // A remote agent (e.g. docs pipeline) can ask for the SVG inline in one round
  // trip: POST ...?format=svg  or  body { "return": "svg" }.
  const wantSvg = (req.query && req.query.format === "svg") || body.return === "svg" || body.format === "svg";
  if (wantSvg) out.svg = renderDiagramSvg(iconNodes, edges);
  return res.status(201).json(out);
}
