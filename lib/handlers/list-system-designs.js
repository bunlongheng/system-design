import db from "../db.js";
import { ownerId } from "../auth-owner.js";

// GET /api/system-designs -> the owner's saved designs, newest first, for the
// gallery. Public read (every design is already shareable by its uuid URL);
// returns the fields the gallery cards need to render a minimap. Capped at 60.
export default async function listSystemDesigns(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const owner = ownerId();
  if (!owner) return res.status(500).json({ error: "OWNER_USER_ID not configured" });

  const { rows } = await db.query(
    "SELECT id, title, slug, nodes, edges, type, tags, created_at FROM system_designs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60",
    [owner],
  );
  return res.status(200).json(rows);
}
