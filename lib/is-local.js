// True only for local/LAN requests, and NEVER in production unless LOCAL_DEV is
// explicitly set. This is the dev-only auth bypass - it must be gated OFF in
// prod so no stray env var can silently open the API. Mirrors diagrams'
// lib/is-local.ts, adapted to a Node-style request (req.headers.host).
export function isLocal(req) {
  if (process.env.NODE_ENV === "production" && process.env.LOCAL_DEV !== "true") return false;
  const host = (req && req.headers && (req.headers.host || req.headers["host"])) || "";
  return /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/.test(host);
}
