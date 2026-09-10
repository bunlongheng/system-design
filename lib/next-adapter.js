// The 12 API handlers in lib/handlers are written against Express-style
// (req, res). Rewriting them for Next's Request/Response would have thrown away
// the 32 unit-test files that mock exactly that shape.
//
// So they are kept verbatim and adapted here instead: one small shim, one place
// to get right, and every existing handler test still exercises shipping code.
export function toRoute(handler) {
  return async function route(request, ctx) {
    const url = new URL(request.url);
    const params = ctx?.params ? await ctx.params : {};
    const query = { ...Object.fromEntries(url.searchParams), ...params };

    let body;
    if (request.method !== "GET" && request.method !== "HEAD") {
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : undefined;
      } catch { body = undefined; }
    }

    const req = {
      method: request.method,
      url: url.pathname + url.search,
      query,
      params,
      body,
      headers: Object.fromEntries(request.headers),
      socket: {},
    };

    // Collected, then turned into one Response - handlers call status()/json()/
    // send()/end() synchronously and expect chaining.
    let statusCode = 200;
    const headers = new Headers();
    let payload = null;
    let done;
    const finished = new Promise((r) => { done = r; });

    const res = {
      statusCode,
      status(code) { statusCode = code; this.statusCode = code; return this; },
      setHeader(k, v) { headers.set(k, String(v)); return this; },
      getHeader(k) { return headers.get(k); },
      json(b) { headers.set("content-type", "application/json; charset=utf-8"); payload = JSON.stringify(b); done(); return this; },
      send(b) { payload = b; done(); return this; },
      end(b) { if (b !== undefined) payload = b; done(); return this; },
      redirect(code, location) {
        if (typeof code === "string") { location = code; code = 302; }
        statusCode = code; headers.set("location", location); payload = null; done(); return this;
      },
    };

    await handler(req, res);
    await finished;

    // Buffers must reach Response as bytes, not as a stringified object.
    const out = Buffer.isBuffer(payload) ? new Uint8Array(payload) : payload;
    return new Response(out, { status: statusCode, headers });
  };
}
