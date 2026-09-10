import db from '../lib/db.js'

// Per-design share card, straight from the framework.
//
// This replaces the whole workaround the Vite build needed: a share-page handler,
// an index.html baked into a JS module at build time, and a rewrite that only
// fired on /demo - because Vercel resolves "/" from the filesystem before
// rewrites run, so a link off the home route could never get its own card.
// generateMetadata runs on every route, so that limitation is gone too.
export async function designMetadata(searchParams, path) {
  const sp = await searchParams;
  const name = typeof sp?.name === "string" ? sp.name : null;
  if (!name) return {};

  let rows = [];
  try {
    ({ rows } = await db.query(
      "SELECT title, slug, description, pattern FROM system_designs WHERE slug = $1 AND is_public = true AND deleted_at IS NULL LIMIT 1",
      [name],
    ));
  } catch {
    // A card is decoration. An unreachable database must never take the page down.
    return {};
  }
  if (!rows.length) return {};

  const row = rows[0];
  const description = row.pattern || row.description || "An interactive AWS & GCP architecture diagram.";
  const url = `${path}?name=${encodeURIComponent(row.slug)}`;
  const image = `/api/og?name=${encodeURIComponent(row.slug)}`;
  return {
    title: `${row.title} · System Design`,
    description,
    openGraph: { type: "article", title: row.title, description, url, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title: row.title, description, images: [image] },
  };
}
