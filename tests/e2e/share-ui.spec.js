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

// Next emits `content="x"/>` where the hand-built HTML emitted `content="x" />`.
// Assert on the VALUE rather than the framework's whitespace, so this spec is
// about the card being right, not about who rendered it.
const meta = (html, key) => {
  const m = new RegExp(`<meta (?:property|name)="${key}" content="([^"]*)"`).exec(html);
  return m ? m[1] : null;
};

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
    // Asserted on the tags themselves - the x-sd-share header existed only to
    // tell the old share handler apart from a static index.html, and there is no
    // static shell any more: generateMetadata runs on every route.
    const served = await api.get(new URL(copied).pathname + new URL(copied).search);
    expect(meta(await served.text(), "og:title")).toBe(DESIGN.title);

    // 3. The panel shows the real card, not a broken image.
    const preview = page.locator('img[alt="Share card preview"]');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((el) => el.naturalWidth), { timeout: 15000 }).toBe(1200);
    expect(await preview.evaluate((el) => el.naturalHeight)).toBe(630);

    // 4. What a crawler pulls from the shared URL: this design's own title and
    //    its own card, not the generic site one.
    const html = await (await api.get(`/demo?name=${slug}`)).text();
    expect(meta(html, "og:title")).toBe(DESIGN.title);
    expect(meta(html, "og:image")).toContain(`/api/og?name=${slug}`);
    expect(meta(html, "twitter:card")).toBe("summary_large_image");

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

// Auto-placement keeps a step badge off its own node, but it cannot see the OTHER
// badges - on a dense diagram two still collide. The owner drags one clear, and
// that correction has to survive a reload or it is worthless.
test("a step badge slides ALONG its edge, persists, and double-click resets it", async ({ page, context, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { ...DESIGN, title: "E2E Badge Drag" },
  });
  const id = (await create.json()).url.split("/?id=")[1];

  try {
    await context.addCookies([{ name: "sd_session", value: OWNER_COOKIE.split("=")[1], url: baseURL }]);
    const open = async () => {
      await page.goto(`/?id=${id}`);
      await page.waitForSelector(".react-flow__node", { timeout: 15000 });
      await page.waitForSelector(".sd-edge-badge.is-movable", { timeout: 15000 });
    };
    const badge = () => page.locator(".sd-edge-badge").first();
    // Centre, not y: these edges are horizontal, so sliding ALONG one moves the
    // badge in x and leaves y almost unchanged.
    const at = async () => {
      const b = await badge().boundingBox();
      return { x: Math.round(b.x + b.width / 2), y: Math.round(b.y + b.height / 2) };
    };
    const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    await open();
    const before = await at();

    // Distance from the badge's centre to the nearest point on its own edge path.
    const distanceFromEdge = async () => {
      const b = await badge().boundingBox();
      return page.evaluate(({ cx, cy }) => {
        const p = document.querySelector(".react-flow__edge-path");
        const svg = p.ownerSVGElement;
        const pt = svg.createSVGPoint();
        // The badge box is in screen space; the path is in the flow's space.
        const m = p.getScreenCTM().inverse();
        pt.x = cx; pt.y = cy;
        const local = pt.matrixTransform(m);
        const len = p.getTotalLength();
        let best = Infinity;
        for (let i = 0; i <= 200; i++) {
          const q = p.getPointAtLength((i / 200) * len);
          best = Math.min(best, Math.hypot(q.x - local.x, q.y - local.y));
        }
        return best;
      }, { cx: b.x + b.width / 2, cy: b.y + b.height / 2 });
    };

    const box = await badge().boundingBox();
    const saved = page.waitForResponse((r) => r.request().method() === "PATCH" && r.status() === 200);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Drag hard AWAY from the line - the badge must refuse to leave it.
    await page.mouse.move(box.x + box.width / 2 + 260, box.y + box.height / 2 - 190, { steps: 14 });
    await page.mouse.up();
    await saved; // the move is only real once it is stored

    // It moved along the edge...
    expect(dist(await at(), before)).toBeGreaterThan(20);
    // ...but it is still sitting on its own edge, not out on open canvas -
    // the cursor was dragged 260px right and 190px up, far off the line.
    expect(await distanceFromEdge()).toBeLessThan(14);
    const moved = await at();

    // Survives a reload - the whole point.
    await open();
    expect(dist(await at(), moved)).toBeLessThan(10);
    expect(await distanceFromEdge()).toBeLessThan(14);

    // Double-click hands it back to the computed spot.
    const reset = page.waitForResponse((r) => r.request().method() === "PATCH" && r.status() === 200);
    await badge().dblclick();
    await reset;
    await open();
    expect(dist(await at(), before)).toBeLessThan(10);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});
