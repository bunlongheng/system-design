import db from "../db.js";
import { authorizeOwner, ownerId } from "../auth-owner.js";
import { rateLimit } from "../rate-limit.js";

// GET  /api/system-designs/:id  -> public read of a saved artifact (the { nodes,
//                                  edges } the SPA renders for the returned URL).
// DELETE /api/system-designs/:id -> owner-only removal: requires the owner's
//                                   signed-in session (sd_session) or local dev.
//                                   The public create Bearer secret cannot delete.
export default async function systemDesignById(req, res) {
  const id = (req.query && req.query.id) || (req.params && req.params.id) || null;
  if (!id) return res.status(400).json({ error: "Missing id" });

  // Validate the uuid shape before hitting the DB: a non-uuid would otherwise
  // throw "invalid input syntax for type uuid" and surface as a generic 500.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (req.method === "GET") {
    const limited = rateLimit(req, { key: "read", limit: 180, windowMs: 60000 });
    if (!limited.ok) {
      res.setHeader("Retry-After", String(limited.retryAfter));
      return res.status(429).json({ error: "Rate limit exceeded" });
    }
    const { rows } = await db.query(
      "SELECT id, title, slug, nodes, edges, type, tags, is_public, description, created_at FROM system_designs WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    // Private diagrams are visible only to the owner; hide as 404 otherwise so a
    // private id can't be probed. Only an explicit is_public===false is private
    // (missing/true is public - the column defaults true).
    if (rows[0].is_public === false && !(await authorizeOwner(req))) {
      return res.status(404).json({ error: "Not found" });
    }
    return res.status(200).json(rows[0]);
  }

  // PATCH -> owner-only: flip is_public (public demo vs private).
  if (req.method === "PATCH") {
    if (!(await authorizeOwner(req, { allowBearer: false }))) return res.status(401).json({ error: "Unauthorized" });
    const isPublic = req.body && typeof req.body.is_public === "boolean" ? req.body.is_public : null;
    if (isPublic === null) return res.status(400).json({ error: "Body must be { is_public: boolean }" });
    const { rows } = await db.query(
      "UPDATE system_designs SET is_public = $1 WHERE id = $2 AND user_id = $3 RETURNING id, is_public",
      [isPublic, id, ownerId()],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(rows[0]);
  }

  if (req.method === "DELETE") {
    if (!(await authorizeOwner(req, { allowBearer: false }))) return res.status(401).json({ error: "Unauthorized" });
    const { rowCount } = await db.query("DELETE FROM system_designs WHERE id = $1 AND user_id = $2", [id, ownerId()]);
    return res.status(200).json({ deleted: rowCount > 0 });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
