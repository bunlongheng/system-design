// Bring-your-own-icon: a caller may pass a remote https icon URL on a node. We
// fetch it ONCE at create time and inline it as a data: URI, so the stored diagram
// is self-contained (no CSP relaxation, no broken icons if their host dies, no
// per-view request to a third party). Catalog ids, /paths and data: URIs pass
// through untouched.

const MAX_BYTES = 24000; // keep rows lean; ~24KB is plenty for an SVG/PNG logo

const isRemote = (ic) => typeof ic === "string" && /^https:\/\//i.test(ic);

// Best-effort SSRF guard: refuse obvious internal / metadata hosts.
function blockedHost(host) {
  const h = (host || "").toLowerCase();
  return (
    h === "localhost" || h === "0.0.0.0" || h === "::1" ||
    h.endsWith(".local") || h.endsWith(".internal") ||
    /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) ||
    /^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)
  );
}

// Fetch a remote https image and return it as a data: URI, or null on any problem.
export async function inlineRemoteIcon(url) {
  let u;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" || blockedHost(u.hostname)) return null;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 5000);
  try {
    // redirect:"error" so a URL can't bounce to an internal host after our check.
    const r = await fetch(url, { redirect: "error", signal: ctrl.signal, headers: { Accept: "image/*" } });
    if (!r.ok) return null;
    const ct = (r.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!/^image\/(png|jpeg|svg\+xml|webp|gif)$/.test(ct)) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) return null;
    return `data:${ct};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Resolve remote-URL icons on nodes to inlined data: URIs. Returns { nodes,
// failed } - `failed` lists node ids whose remote icon could not be fetched so
// the caller can reject with a clear error.
export async function resolveNodeIcons(nodes) {
  const failed = [];
  const resolved = await Promise.all(
    nodes.map(async (n) => {
      if (!isRemote(n.icon)) return n;
      const inlined = await inlineRemoteIcon(n.icon);
      if (!inlined) { failed.push(n.id); return { ...n, icon: undefined }; }
      return { ...n, icon: inlined };
    }),
  );
  return { nodes: resolved, failed };
}
