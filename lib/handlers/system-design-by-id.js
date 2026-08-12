import db from "../db.js";
import { bearerOk } from "../auth-owner.js";

// GET  /api/system-designs/:id  -> public read of a saved artifact (the { nodes,
//                                  edges } the SPA renders for the returned URL).
// DELETE /api/system-designs/:id -> Bearer-gated removal (lets an API caller
//                                   clean up a test artifact).
export default async function systemDesignById(req, res) {
  const id = (req.query && req.query.id) || (req.params && req.params.id) || null;
  if (!id) return res.status(400).json({ error: "Missing id" });

  if (req.method === "GET") {
    const { rows } = await db.query(
      "SELECT id, title, slug, nodes, edges, type, tags, created_at FROM system_designs WHERE id = $1",
      [id],
    );
    if (rows.length === 0) return res.status(404).json({ error: "Not found" });
    return res.status(200).json(rows[0]);
  }

  if (req.method === "DELETE") {
    if (!bearerOk(req)) return res.status(401).json({ error: "Unauthorized" });
    const { rowCount } = await db.query("DELETE FROM system_designs WHERE id = $1", [id]);
    return res.status(200).json({ deleted: rowCount > 0 });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
