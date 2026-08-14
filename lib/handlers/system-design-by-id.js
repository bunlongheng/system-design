import db from "../db.js";
import { authorizeOwner } from "../auth-owner.js";

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
    const { rows } = await db.query(
      "SELECT id, title, slug, nodes, edges, type, tags, created_at FROM system_designs WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(rows[0]);
  }

  if (req.method === "DELETE") {
    if (!(await authorizeOwner(req, { allowBearer: false }))) return res.status(401).json({ error: "Unauthorized" });
    const { rowCount } = await db.query("DELETE FROM system_designs WHERE id = $1", [id]);
    return res.status(200).json({ deleted: rowCount > 0 });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
