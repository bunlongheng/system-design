import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// The share flow end to end, in a real browser, the way a person actually does
// it: open a PRIVATE diagram, hit Share, and end up with a link someone else can
// open that previews as a proper card.
//
// This is the spec that guards the whole chain - publish, the copied URL, the
// card image, and the meta tags a crawler reads. If any link in it breaks, the
// thing the user sees is a dead link or a generic grey card.
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

test.use({ viewport: { width: 1440, height: 900 } });

const DESIGN = {
  title: "E2E Share Flow",
  type: "system-design",
  nodes: [
    { id: "user", position: { x: 40, y: 200 } },
    { id: "apigw", position: { x: 300, y: 200 } },
    { id: "lambda", position: { x: 560, y: 200 } },
    { id: "dynamo", position: { x: 820, y: 200 } },
  ],
  edges: [
    { id: "e1", source: "user", target: "apigw", label: "request" },
    { id: "e2", source: "apigw", target: "lambda", label: "invoke" },
    { id: "e3", source: "lambda", target: "dynamo", label: "read/write" },
  ],
};

test("Share on a private diagram publishes it, previews the card, and hands out a working link", async ({
  page,
  context,
  baseURL,
}) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: DESIGN,
  });
  expect(create.status()).toBe(201);
  const id = (await create.json()).url.split("/?id=")[1];
  const row = await (await api.get(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } })).json();
  const slug = row.slug;

  try {
    // Created private: a stranger cannot read it, and it previews as the generic
    // site card. That is the state the owner starts from.
    expect(row.is_public).toBe(false);
    expect((await api.get(`/api/system-designs/${id}`)).status()).toBe(404);

    await context.addCookies([{ name: "sd_session", value: OWNER_COOKIE.split("=")[1], url: baseURL }]);
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(`/?id=${id}`);
    await page.waitForSelector(".react-flow__node", { timeout: 15000 });

    // Open the share panel and hit Link, which is what publishes.
    await page.locator('button:has-text("Share")').first().click();
    await page.locator('button:has-text("Link")').first().click();
    await expect.poll(async () => (await api.get(`/api/system-designs/${id}`)).status(), { timeout: 10000 }).toBe(200);

    // 1. It is now readable by someone with no session at all.
    const pub = await (await api.get(`/api/system-designs/${id}`)).json();
    expect(pub.is_public).toBe(true);

    // 2. The clipboard holds the readable ?name= link on the public origin -
    //    never a localhost URL, which is useless to the person receiving it.
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain(`?name=${slug}`);
    expect(copied).not.toContain("localhost");
    // It MUST be the /demo route. Vercel resolves "/" from the filesystem before
    // rewrites run, so a link off "/" never reaches the share function and
    // previews as the generic site card.
    expect(copied).toContain(`/demo?name=${slug}`);

    // And that exact copied URL is the one that serves this design's own tags.
    const served = await api.get(new URL(copied).pathname + new URL(copied).search);
    expect(served.headers()["x-sd-share"]).toBe("hit");

    // 3. The panel shows the real card, not a broken image.
    const preview = page.locator('img[alt="Share card preview"]');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((el) => el.naturalWidth), { timeout: 15000 }).toBe(1200);
    expect(await preview.evaluate((el) => el.naturalHeight)).toBe(630);

    // 4. What a crawler pulls from the shared URL: this design's own title and
    //    its own card, not the generic site one.
    const html = await (await api.get(`/demo?name=${slug}`)).text();
    expect(html).toContain(`<meta property="og:title" content="${DESIGN.title}" />`);
    expect(html).not.toContain('<meta property="og:title" content="System Design" />');
    expect(html).toMatch(new RegExp(`og:image" content="[^"]*/api/og\\?name=${slug}"`));
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');

    // 5. And that card is a real 1200x630 PNG with the diagram drawn in it.
    const og = await api.get(`/api/og?name=${slug}`);
    expect(og.headers()["content-type"]).toBe("image/png");
    const buf = await og.body();
    expect(buf.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(buf.readUInt32BE(16)).toBe(1200);
    expect(buf.readUInt32BE(20)).toBe(630);
    // A card carrying 4 inlined service logos is far bigger than an empty frame;
    // this catches a card that renders as a blank rectangle.
    expect(buf.length).toBeGreaterThan(20000);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});

// The regression that shipped: publishing a design removed it from the owner
// list (which returns only PRIVATE rows) without adding it to the public list
// (which returns only the 12 curated demos). The old ?name= resolver scanned
// those two lists, so a published non-demo design was in neither and its own
// share link 404'd - sharing a diagram broke the link sharing had just made.
test("a PUBLISHED non-demo design resolves by slug - sharing must not break its own link", async ({
  page,
  baseURL,
}) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { ...DESIGN, title: "E2E Published Not A Demo" },
  });
  const id = (await create.json()).url.split("/?id=")[1];
  const { slug } = await (await api.get(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } })).json();

  try {
    await api.patch(`/api/system-designs/${id}`, {
      headers: { Cookie: OWNER_COOKIE, "Content-Type": "application/json" },
      data: { is_public: true },
    });

    // It is public, and it is NOT on the curated demo roster...
    const demos = await (await api.get("/api/system-designs/public")).json();
    expect(demos.some((d) => d.slug === slug)).toBe(false);
    // ...and it is NOT in the owner list either, which only returns private rows.
    const mine = await (await api.get("/api/system-designs", { headers: { Cookie: OWNER_COOKIE } })).json();
    expect(mine.some((d) => d.slug === slug)).toBe(false);

    // It must STILL resolve by slug, for a stranger with no session.
    const bySlug = await api.get(`/api/system-designs/${slug}`);
    expect(bySlug.status()).toBe(200);
    expect((await bySlug.json()).id).toBe(id);

    // And the page itself must render the canvas, not "Design not found".
    await page.goto(`/?name=${slug}`);
    await page.waitForSelector(".react-flow__node", { timeout: 15000 });
    expect(await page.locator(".react-flow__node-awsNode").count()).toBe(DESIGN.nodes.length);
    await expect(page.locator("text=Design not found")).toHaveCount(0);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});

test("a slug for a PRIVATE design stays hidden from a stranger", async ({ baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { ...DESIGN, title: "E2E Private By Slug" },
  });
  const id = (await create.json()).url.split("/?id=")[1];
  const { slug } = await (await api.get(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } })).json();
  try {
    // Never published - a slug must not become a way around the privacy check.
    expect((await api.get(`/api/system-designs/${slug}`)).status()).toBe(404);
    expect((await api.get(`/api/system-designs/${slug}`, { headers: { Cookie: OWNER_COOKIE } })).status()).toBe(200);
    // And a slug cannot be used to mutate anything.
    expect((await api.delete(`/api/system-designs/${slug}`, { headers: { Cookie: OWNER_COOKIE } })).status()).toBe(400);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});
