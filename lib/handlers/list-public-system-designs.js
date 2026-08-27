import db from "../db.js";
import { rateLimit } from "../rate-limit.js";

// GET /api/system-designs/public -> PUBLIC (no auth). The demo gallery anonymous
// visitors see: only is_public=true designs, newest first. Same row shape as the
// owner list so the gallery cards render identically.
export default async function listPublicSystemDesigns(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const limited = rateLimit(req, { key: "public-list", limit: 120, windowMs: 60000 });
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const { rows } = await db.query(
    "SELECT id, title, slug, nodes, edges, type, tags, is_public, created_at FROM system_designs WHERE is_public = true ORDER BY created_at DESC LIMIT 60",
  );
  return res.status(200).json(rows);
}
