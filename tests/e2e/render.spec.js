import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// Browser e2e: prove the artifact URL actually RENDERS in the SPA, not just that
// the API returns JSON. Create a design via the public API, open the returned
// /?id= URL in a real browser, and assert the React Flow canvas paints its nodes.
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

const DESIGN = {
  title: "E2E Render Check",
  type: "system-design",
  nodes: [
    { id: "user", position: { x: 40, y: 200 } },
    { id: "cloudfront", position: { x: 260, y: 200 } },
    { id: "lambda", position: { x: 480, y: 200 } },
    { id: "dynamo", position: { x: 700, y: 200 } },
  ],
  edges: [
    { id: "e1", source: "user", target: "cloudfront", label: "HTTPS" },
    { id: "e2", source: "cloudfront", target: "lambda", label: "invoke" },
    { id: "e3", source: "lambda", target: "dynamo", label: "rw" },
  ],
};

test("the /?id= URL renders the design in the browser", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: DESIGN,
  });
  expect(create.status()).toBe(201);
  const { url } = await create.json();
  const id = url.split("/?id=")[1];

  // New diagrams are private by default; publish it so the browser (no auth) can
  // load and render it.
  await api.patch(`/api/system-designs/${id}`, {
    headers: { Cookie: OWNER_COOKIE, "Content-Type": "application/json" },
    data: { is_public: true },
  });

  try {
    await page.goto(`/?id=${id}`);
    // React Flow paints .react-flow__node once the design loads.
    await page.waitForSelector(".react-flow__node", { timeout: 15000 });
    // Count only the service nodes (awsNode); the canvas also renders auto
    // Start/Destination marker nodes that are not part of the design.
    const nodeCount = await page.locator(".react-flow__node-awsNode").count();
    expect(nodeCount).toBe(DESIGN.nodes.length);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});

// Same design, opened by its readable slug instead. /?name= is the URL the detail
// view now writes, so it has to resolve on a cold load with no gallery state.
test("the /?name= URL renders the design in the browser", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: { ...DESIGN, title: "E2E Name Check" },
  });
  expect(create.status()).toBe(201);
  const { url } = await create.json();
  const id = url.split("/?id=")[1];

  const row = await (await api.get(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } })).json();
  expect(row.slug).toBeTruthy();

  try {
    // Signed in as the owner, so the private row is reachable by slug.
    await page.context().addCookies([{ name: "sd_session", value: OWNER_COOKIE.split("=")[1], url: baseURL }]);
    await page.goto(`/?name=${row.slug}`);
    await page.waitForSelector(".react-flow__node", { timeout: 15000 });
    expect(await page.locator(".react-flow__node-awsNode").count()).toBe(DESIGN.nodes.length);
    // The param survives the load - a shared link stays shareable.
    expect(page.url()).toContain(`name=${row.slug}`);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});

// A shared link is opened on a phone. Fitting the whole graph there used to land
// at zoom 0.2 (2px labels); now it opens on the start node at a readable zoom.
test("a phone opens the canvas at a readable zoom, not fit-to-everything", async ({ browser, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const wide = {
    title: "Phone fit check", is_public: true,
    nodes: ["user", "cloudfront", "apigw", "lambda", "dynamo", "s3", "sqs"].map((id) => ({ id })),
    edges: [["user", "cloudfront"], ["cloudfront", "apigw"], ["apigw", "lambda"], ["lambda", "dynamo"], ["lambda", "s3"], ["lambda", "sqs"]].map(([source, target]) => ({ source, target })),
  };
  const create = await api.post("/api/ai/system-designs", { headers: { Authorization: `Bearer ${SECRET}` }, data: wide });
  const id = (await create.json()).url.split("/?id=")[1];
  try {
    const row = await (await api.get(`/api/system-designs/${id}`)).json();
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    await page.goto(`/demo?name=${row.slug}`);
    await page.waitForSelector(".react-flow__node", { timeout: 20000 });
    await page.waitForTimeout(800);
    const scale = await page.locator(".react-flow__viewport").evaluate((el) => {
      const m = /scale\(([\d.]+)\)/.exec(el.style.transform); return m ? Number(m[1]) : NaN;
    });
    expect(scale).toBeGreaterThanOrEqual(0.5);
    // The start node is on screen.
    const box = await page.locator('.react-flow__node[data-id="user"]').boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    await ctx.close();
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { cookie: OWNER_COOKIE } });
  }
});
