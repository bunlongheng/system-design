import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// The share path a crawler walks: GET the design's URL, read the head, then GET
// the og:image it points at.
//
// The spec creates and publishes its OWN design rather than leaning on the demo
// roster - CI runs against an empty database with only migrations applied, so
// any seeded row is a local-only assumption.
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

const DESIGN = {
  title: "E2E Share Card",
  type: "system-design",
  nodes: [
    { id: "user", position: { x: 40, y: 200 } },
    { id: "apigw", position: { x: 260, y: 200 } },
    { id: "ses", position: { x: 480, y: 200 } },
    { id: "redis", position: { x: 700, y: 200 } },
  ],
  edges: [
    { id: "e1", source: "user", target: "apigw", label: "send" },
    { id: "e2", source: "apigw", target: "ses", label: "deliver" },
    { id: "e3", source: "ses", target: "redis", label: "suppress" },
  ],
};

// Creates the design, publishes it, hands (api, id, slug) to the body, cleans up.
async function withPublicDesign(baseURL, body) {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: DESIGN,
  });
  expect(create.status()).toBe(201);
  const id = (await create.json()).url.split("/?id=")[1];
  try {
    await api.patch(`/api/system-designs/${id}`, {
      headers: { Cookie: OWNER_COOKIE, "Content-Type": "application/json" },
      data: { is_public: true },
    });
    const row = await (await api.get(`/api/system-designs/${id}`)).json();
    expect(row.slug).toBeTruthy();
    await body(api, id, row.slug);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
}

test("a shared design URL serves its OWN og tags, not the generic site card", async ({ baseURL }) => {
  await withPublicDesign(baseURL, async (api, _id, slug) => {
    const res = await api.get(`/demo?name=${slug}`);
    expect(res.status()).toBe(200);
    const html = await res.text();

    // Title comes from the design row, not the static shell.
    expect(html).toContain(`<meta property="og:title" content="${DESIGN.title}" />`);
    expect(html).not.toContain('<meta property="og:title" content="System Design" />');
    expect(html).toContain('<meta property="og:type" content="article" />');
    expect(html).toContain(`<title>${DESIGN.title} · System Design</title>`);

    // The card points at the per-design renderer, and the canonical url keeps ?name=.
    expect(html).toMatch(new RegExp(`og:image" content="[^"]*/api/og\\?name=${slug}"`));
    expect(html).toMatch(new RegExp(`og:url" content="[^"]*/demo\\?name=${slug}"`));

    // And it is still the real SPA shell - a human gets the app, not a stub.
    expect(html).toContain('<div id="root">');
    expect(html).toMatch(/<script type="module"[^>]*src="\/assets\//);
  });
});

test("/api/og renders a real 1200x630 PNG for a public design", async ({ baseURL }) => {
  await withPublicDesign(baseURL, async (api, _id, slug) => {
    const res = await api.get(`/api/og?name=${slug}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toBe("image/png");

    const buf = await res.body();
    expect(buf.length).toBeGreaterThan(5000);
    // PNG magic, then width/height straight out of the IHDR chunk.
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
  });
});

test("a PRIVATE design gets no card and no title - an unlisted link stays unlisted", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL, maxRedirects: 0 });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { ...DESIGN, title: "E2E Private Card" },
  });
  const id = (await create.json()).url.split("/?id=")[1];
  try {
    // Created private by default - never published.
    const row = await (await api.get(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } })).json();
    const html = await (await api.get(`/?name=${row.slug}`)).text();
    expect(html).not.toContain("E2E Private Card");
    expect(html).toContain('<meta property="og:title" content="System Design" />');

    const og = await api.get(`/api/og?name=${row.slug}`);
    expect(og.status()).toBe(302);
    expect(og.headers()["location"]).toBe("/og.png");
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
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
