import { NextResponse } from "next/server";

// Next bootstraps with inline <script> tags, which the app's CSP forbids
// (script-src 'self' - deliberately no 'unsafe-inline', no 'unsafe-eval').
// Rather than weaken that to get the port working, each response gets a fresh
// nonce: Next stamps it onto its own scripts, and nothing else can execute.
export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const dev = process.env.NODE_ENV === "development";

  const csp = [
    "default-src 'self'",
    "img-src 'self' data: https://avatars.githubusercontent.com",
    "style-src 'self' 'unsafe-inline'",
    // strict-dynamic lets the nonced bootstrap load the chunks it needs without
    // whitelisting anything by URL. Dev additionally needs eval for HMR.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "font-src 'self' data:",
    `connect-src 'self'${dev ? " ws: http://localhost:*" : ""}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
  ].join("; ");

  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  const res = NextResponse.next({ request: { headers } });
  res.headers.set("Content-Security-Policy", csp);
  return res;
}

export const config = {
  // Static assets need no nonce and would only pay the cost.
  matcher: [{ source: "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico|json|webmanifest)$).*)" }],
};
