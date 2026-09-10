import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// Panel state survives BACK TO THE GALLERY AND REOPEN, not just a reload.
//
// Those are different paths. A reload refetches the design; reopening from the
// gallery uses the list that was fetched once at page load, and that copy of
// view_state goes stale the moment a panel is toggled. Reopening from the stale
// row reset the panels - and the reset was then SAVED, destroying the real state,
// so the next reload lost it too. The reload-only spec could never have caught it.
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

test.use({ viewport: { width: 1500, height: 950 } });

const DESIGN = {
  title: "E2E Panel Memory",
  type: "system-design",
  nodes: [{ id: "user" }, { id: "apigw" }, { id: "lambda" }],
  edges: [
    { source: "user", target: "apigw", label: "one" },
    { source: "apigw", target: "lambda", label: "two" },
  ],
};

test("Steps survives back-to-gallery and reopen, and off stays off", async ({ page, context, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: DESIGN,
  });
  const id = (await create.json()).url.split("/?id=")[1];

  try {
    await context.addCookies([{ name: "sd_session", value: OWNER_COOKIE.split("=")[1], url: baseURL }]);
    const btn = (name) => page.locator(`button:has-text("${name}")`).first();
    const on = async (name) => (await btn(name).evaluate((e) => e.className)).includes("is-on");
    const card = () => page.locator(`button.dc-open[aria-label*="${DESIGN.title}"]`).first();

    const openFromGallery = async () => {
      await page.goto("/");
      await card().waitFor({ timeout: 20000 });
      await card().click();
      await page.waitForSelector(".react-flow__node", { timeout: 20000 });
    };

    await openFromGallery();
    if (!(await on("Steps"))) await btn("Steps").click();
    await expect.poll(() => on("Steps")).toBe(true);
    // Let the save land before navigating away.
    await page.waitForResponse((r) => r.request().method() === "PATCH" && r.status() === 200);

    // Back to the gallery, then reopen from it - the path that used to reset it.
    await page.locator("header button").first().click();
    await card().waitFor({ timeout: 20000 });
    await card().click();
    await page.waitForSelector(".react-flow__node", { timeout: 20000 });
    await expect.poll(() => on("Steps"), { timeout: 10000 }).toBe(true);

    // A reload must agree - if the reopen had saved a reset, this is where it showed.
    await page.reload();
    await page.waitForSelector(".react-flow__node", { timeout: 20000 });
    await expect.poll(() => on("Steps"), { timeout: 10000 }).toBe(true);

    // Turning it OFF has to stick too, not just on.
    await btn("Steps").click();
    await expect.poll(() => on("Steps")).toBe(false);
    await page.waitForResponse((r) => r.request().method() === "PATCH" && r.status() === 200);
    await page.locator("header button").first().click();
    await card().waitFor({ timeout: 20000 });
    await card().click();
    await page.waitForSelector(".react-flow__node", { timeout: 20000 });
    await expect.poll(() => on("Steps"), { timeout: 10000 }).toBe(false);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.delete(`/api/system-designs/${id}?purge=1`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});
