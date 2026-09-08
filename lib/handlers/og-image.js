import { Resvg } from "@resvg/resvg-js";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

import db from "../db.js";
import { rateLimit } from "../rate-limit.js";
import { renderOgSvg, OG_W, OG_H } from "../render-og.js";
import fontData from "../font-data.js";

// resvg only takes font PATHS, and a serverless function has neither system
// fonts nor a readable repo. So the bytes ride along in font-data.js and get
// written to the writable tmpdir once per cold start - after that it is a
// no-op and the paths are reused.
let fontPaths = null;
function fonts() {
  if (fontPaths) return fontPaths;
  const dir = path.join(os.tmpdir(), "sd-fonts");
  mkdirSync(dir, { recursive: true });
  fontPaths = Object.entries(fontData).map(([name, b64]) => {
    const p = path.join(dir, name);
    if (!existsSync(p)) writeFileSync(p, Buffer.from(b64, "base64"));
    return p;
  });
  return fontPaths;
}

// GET /api/og?name=<slug>  (or ?id=<uuid>) -> PNG 1200x630 -> PUBLIC (no auth).
// The share card a crawler fetches: brand mark, title, pattern line, chips, and
// a preview of the diagram itself. Private designs get no card - a card would
// leak the title and the shape of something deliberately unlisted.
export default async function ogImage(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const limited = rateLimit(req, { key: "og", limit: 120, windowMs: 60000 });
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const q = req.query || {};
  const name = typeof q.name === "string" ? q.name : null;
  const id = typeof q.id === "string" ? q.id : null;

  let design = null;
  if (name) {
    const { rows } = await db.query(
      "SELECT title, nodes, edges, description, pattern, difficulty FROM system_designs WHERE slug = $1 AND is_public = true LIMIT 1",
      [name],
    );
    design = rows[0] || null;
  } else if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    const { rows } = await db.query(
      "SELECT title, nodes, edges, description, pattern, difficulty FROM system_designs WHERE id = $1 AND is_public = true",
      [id],
    );
    design = rows[0] || null;
  }

  // No match -> hand back the static site card rather than a broken image, so a
  // stale or private link still previews as something.
  if (!design) {
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.redirect(302, "/og.png");
  }

  const svg = renderOgSvg(design);
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: OG_W },
    font: { fontFiles: fonts(), defaultFontFamily: "Roboto", loadSystemFonts: false },
  })
    .render()
    .asPng();

  res.setHeader("Content-Type", "image/png");
  res.setHeader("Content-Length", String(png.length));
  // Long cache: the card only changes when the design does, and a redeploy of
  // the renderer busts it anyway via the new deployment URL.
  res.setHeader("Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return res.status(200).end(png);
}

export { OG_W, OG_H };
