import { test, expect, request } from "@playwright/test";

// The share path a crawler walks: GET the design's URL, read the head, then GET
// the og:image it points at. Runs against the curated demo roster, which is
// public by definition, so nothing has to be created or cleaned up.
const SLUG = "email-newsletter-500m-subscribers";

test("a shared design URL serves its OWN og tags, not the generic site card", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  try {
    const res = await api.get(`/demo?name=${SLUG}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Title and description come from the design row.
    expect(html).toContain('<meta property="og:title" content="Email Newsletter - 500M Subscribers" />');
    expect(html).toContain("og:description");
    expect(html).not.toContain('<meta property="og:title" content="System Design" />');
    expect(html).toContain('<meta property="og:type" content="article" />');

    // The card points at the per-design renderer, and the canonical url keeps ?name=.
    expect(html).toMatch(new RegExp(`og:image" content="[^"]*/api/og\\?name=${SLUG}"`));
    expect(html).toMatch(new RegExp(`og:url" content="[^"]*/demo\\?name=${SLUG}"`));

    // And it is still the real SPA shell - a human gets the app, not a stub.
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/<script type="module"[^>]*src="\/assets\//);
  } finally {
    await api.dispose();
  }
});

test("the gallery itself keeps the generic card", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  try {
    const html = await (await api.get("/demo")).text();
    expect(html).toContain('<meta property="og:title" content="System Design" />');
  } finally {
    await api.dispose();
  }
});

test("/api/og renders a real 1200x630 PNG for a public design", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  try {
    const res = await api.get(`/api/og?name=${SLUG}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");

    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(10000);
    // PNG magic, then width/height out of the IHDR chunk.
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  } finally {
    await api.dispose();
  }
});

test("/api/og falls back to the static card for an unknown slug", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL, maxRedirects: 0 });
  try {
    const res = await api.get("/api/og?name=no-such-design-exists");
    expect(res.status()).toBe(302);
    expect(res.headers()["location"]).toBe("/og.png");
  } finally {
    await api.dispose();
  }
});
