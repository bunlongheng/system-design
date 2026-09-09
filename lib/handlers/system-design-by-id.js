import db from "../db.js";
import { authorizeOwner, ownerId } from "../auth-owner.js";
import { rateLimit } from "../rate-limit.js";
import { renderDiagramSvg } from "../render-svg.js";

// GET  /api/system-designs/:idOrSlug -> public read of a saved artifact (the
//                                  { nodes, edges } the SPA renders). Accepts the
//                                  uuid or the readable slug behind /?name=.
// DELETE /api/system-designs/:id -> owner-only SOFT delete: stamps deleted_at so
//                                   the row goes to trash and stays recoverable.
//                                   ?purge=1 permanently removes a row that is
//                                   ALREADY in trash (empty-trash).
//                                   Requires the owner's signed-in session
//                                   (sd_session) or local dev; the public create
//                                   Bearer secret cannot delete.
export default async function systemDesignById(req, res) {
  const id = (req.query && req.query.id) || (req.params && req.params.id) || null;
  if (!id) return res.status(400).json({ error: "Missing id" });

  // The param is EITHER a uuid or a slug. Slugs exist so a shared link can read
  // as /?name=my-design instead of a uuid, and resolving one has to be a real
  // lookup here - it used to be done by scanning the two list endpoints, but the
  // owner list returns only PRIVATE designs and the public list only the 12
  // curated demos, so a published non-demo design was in neither and its own
  // share link 404'd.
  //
  // Mutations stay uuid-only: a slug changes meaning if a design is renamed, so
  // it is not a safe address to delete or overwrite by.
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const SLUG_RE = /^[a-z0-9][a-z0-9-]{0,199}$/i;
  if (!isUuid) {
    if (req.method !== "GET") return res.status(400).json({ error: "Invalid id" });
    if (!SLUG_RE.test(id)) return res.status(400).json({ error: "Invalid id" });
  }
  const KEY = isUuid ? "id" : "slug";

  if (req.method === "GET") {
    const limited = rateLimit(req, { key: "read", limit: 180, windowMs: 60000 });
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfter));
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    const { rows } = await db.query(
      `SELECT id, title, slug, nodes, edges, type, tags, is_public, description, pattern, difficulty, view_state, created_at
         FROM system_designs WHERE ${KEY} = $1 AND deleted_at IS NULL LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    // Private diagrams are visible only to the owner; hide as 404 otherwise so a
    // private id can't be probed. Only an explicit is_public===false is private
    // (missing/true is public - the column defaults true).
    if (rows[0].is_public === false && !(await authorizeOwner(req))) {
      return res.status(404).json({ error: "Not found" });
    }
    // ?format=svg -> render the diagram to a self-contained SVG (docs-ready).
    if ((req.query && (req.query.format === "svg" || req.query.svg === "1")) || /image\/svg/.test(req.headers?.accept || "")) {
      try {
        const svg = renderDiagramSvg(rows[0].nodes, rows[0].edges);
        res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
        res.setHeader("Cache-Control", "public, max-age=60");
        return res.status(200).send(svg);
      } catch (e) {
        return res.status(500).json({ error: "SVG render failed", detail: String(e && e.message || e) });
      }
    }
    return res.status(200).json(rows[0]);
  }

  // PATCH -> owner-only: flip is_public (public demo vs private), save the node
  // layout (positions) after the owner rearranges the canvas, OR remember which
  // panel/badge style was open so reopening restores it.
  if (req.method === "PATCH") {
    if (!(await authorizeOwner(req, { allowBearer: false }))) return res.status(401).json({ error: "Unauthorized" });
    const body = req.body || {};

    // Save canvas layout: persist each node's id + dragged position, dropping any
    // render-only fields so the stored shape stays lean ({id, position}).
    if (Array.isArray(body.nodes)) {
      const clean = body.nodes
        .filter((n) => n && typeof n.id === "string")
        .map((n) => ({
          id: n.id,
          ...(n.position && Number.isFinite(n.position.x) && Number.isFinite(n.position.y)
            ? { position: { x: n.position.x, y: n.position.y } }
            : {}),
          // Keep bring-your-own-icon fields; a layout save must not drop them.
          ...(typeof n.icon === "string" && n.icon ? { icon: n.icon } : {}),
          ...(typeof n.label === "string" && n.label ? { label: n.label } : {}),
          ...(typeof n.color === "string" && n.color ? { color: n.color } : {}),
          ...(typeof n.sub === "string" && n.sub ? { sub: n.sub } : {}),
        }));
      if (!clean.length) return res.status(400).json({ error: "nodes must be a non-empty array" });
      const { rows } = await db.query(
        "UPDATE system_designs SET nodes = $1, updated_at = now() WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL RETURNING id",
        [JSON.stringify(clean), id, ownerId()],
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ id: rows[0].id, saved: clean.length });
    }

    // Remember which panel and badge style were open, so reopening this diagram
    // restores it instead of resetting. Small, bounded, and owner-only.
    if (body.view_state && typeof body.view_state === "object") {
      const v = body.view_state;
      // Panels are NOT mutually exclusive - Details and Steps can both be open -
      // so store the whole set. Storing one "winner" meant reopening restored
      // only the panel that happened to win the tie.
      const PANELS = ["steps", "details", "share", "code"];
      const clean = {
        panels: Array.isArray(v.panels) ? PANELS.filter((x) => v.panels.includes(x)) : [],
        badge: ["dark", "silver", "color", "plain"].includes(v.badge) ? v.badge : null,
      };
      const { rows } = await db.query(
        "UPDATE system_designs SET view_state = $1::jsonb WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL RETURNING id",
        [JSON.stringify(clean), id, ownerId()],
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      return res.status(200).json({ id: rows[0].id, view_state: clean });
    }

    const isPublic = typeof body.is_public === "boolean" ? body.is_public : null;
    if (isPublic === null) return res.status(400).json({ error: "Body must be { is_public: boolean }, { nodes: [...] } or { view_state: {...} }" });
    const { rows } = await db.query(
      "UPDATE system_designs SET is_public = $1 WHERE id = $2 AND user_id = $3 AND deleted_at IS NULL RETURNING id, is_public",
      [isPublic, id, ownerId()],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(rows[0]);
  }

  if (req.method === "DELETE") {
    if (!(await authorizeOwner(req, { allowBearer: false }))) return res.status(401).json({ error: "Unauthorized" });

    // ?purge=1 empties trash: a permanent delete, and ONLY for a row already in
    // trash. So destroying something takes two deliberate calls, and the first
    // one is always undoable.
    if (req.query?.purge === "1" || req.query?.purge === "true") {
      const { rowCount } = await db.query(
        "DELETE FROM system_designs WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL",
        [id, ownerId()],
      );
      return res.status(200).json({ purged: rowCount > 0 });
    }

    const { rowCount } = await db.query(
      "UPDATE system_designs SET deleted_at = now() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL",
      [id, ownerId()],
    );
    return res.status(200).json({ deleted: rowCount > 0, recoverable: true });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
