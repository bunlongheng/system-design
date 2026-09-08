import db from "../db.js";
import { rateLimit } from "../rate-limit.js";
import shell from "../share-shell.js";

// Meta tags the SPA shell ships with, which we swap per design. Anything not in
// this list is left exactly as the build emitted it.
const SWAP = [
  [/<title>[^<]*<\/title>/, (v) => `<title>${v.title} · System Design</title>`],
  [/<meta name="description" content="[^"]*" \/>/, (v) => `<meta name="description" content="${v.desc}" />`],
  [/<meta property="og:title" content="[^"]*" \/>/, (v) => `<meta property="og:title" content="${v.title}" />`],
  [/<meta property="og:description" content="[^"]*" \/>/, (v) => `<meta property="og:description" content="${v.desc}" />`],
  [/<meta property="og:url" content="[^"]*" \/>/, (v) => `<meta property="og:url" content="${v.url}" />`],
  [/<meta property="og:image" content="[^"]*" \/>/, (v) => `<meta property="og:image" content="${v.img}" />`],
  [/<meta property="og:type" content="[^"]*" \/>/, () => `<meta property="og:type" content="article" />`],
  [/<meta name="twitter:title" content="[^"]*" \/>/, (v) => `<meta name="twitter:title" content="${v.title}" />`],
  [/<meta name="twitter:description" content="[^"]*" \/>/, (v) => `<meta name="twitter:description" content="${v.desc}" />`],
  [/<meta name="twitter:image" content="[^"]*" \/>/, (v) => `<meta name="twitter:image" content="${v.img}" />`],
];

function attr(s) {
  return String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

function origin(req) {
  const host = req.headers?.["x-forwarded-host"] || req.headers?.host || "system-design-bheng.vercel.app";
  const proto = req.headers?.["x-forwarded-proto"] || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// Serves the SPA shell with per-design OG/Twitter tags baked into the head, for
// the share URLs (/?name=<slug> and /demo?name=<slug>). A crawler never runs the
// app's JS, so without this every shared design previews as the generic site
// card. The body is the real built index.html, so a human still just gets the
// app - same URL, no redirect hop.
export default async function sharePage(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const limited = rateLimit(req, { key: "share", limit: 240, windowMs: 60000 });
  if (!limited.ok) {
    res.setHeader("Retry-After", String(limited.retryAfter));
    return res.status(429).json({ error: "Rate limit exceeded" });
  }

  const q = req.query || {};
  const name = typeof q.name === "string" ? q.name : null;
  const base = origin(req);
  const send = (html) => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600, stale-while-revalidate=86400");
    return res.status(200).send(html);
  };

  // No slug, or a slug that is not a public design -> the untouched shell. The
  // app still boots and resolves (or 404s) client-side; we just do not advertise
  // a title for something a stranger cannot see.
  if (!name) return send(shell);

  // A share card is decoration. If the lookup fails - unreachable database, a
  // preview deploy with no env - the page must still be the app, never an error.
  let rows = [];
  try {
    ({ rows } = await db.query(
      "SELECT title, slug, description, pattern FROM system_designs WHERE slug = $1 AND is_public = true AND deleted_at IS NULL LIMIT 1",
      [name],
    ));
  } catch {
    return send(shell);
  }
  if (!rows.length) return send(shell);

  const row = rows[0];
  const path = req.url?.startsWith("/demo") ? "/demo" : "/";
  const v = {
    title: attr(row.title),
    desc: attr(row.pattern || row.description || "An interactive AWS & GCP architecture diagram."),
    url: `${base}${path}?name=${encodeURIComponent(row.slug)}`,
    img: `${base}/api/og?name=${encodeURIComponent(row.slug)}`,
  };

  let html = shell;
  for (const [re, build] of SWAP) html = html.replace(re, build(v));
  return send(html);
}
