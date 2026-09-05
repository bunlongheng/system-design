import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// Arrange is the one click on the canvas that can throw away a hand-placed
// layout, so it has to be reversible. This locks in the whole offer: it is not
// in the toolbar until you press Arrange, it puts the exact previous positions
// back, it flips to Redo, and it retires once you move a node yourself.
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

test.use({ viewport: { width: 1440, height: 900 } });

const DESIGN = {
  title: "E2E Arrange Undo",
  type: "system-design",
  // Deliberately scattered, so dagre's tidy row is clearly a different layout.
  nodes: [
    { id: "user", position: { x: 80, y: 120 } },
    { id: "cloudfront", position: { x: 420, y: 300 } },
    { id: "lambda", position: { x: 760, y: 60 } },
    { id: "dynamo", position: { x: 1100, y: 380 } },
  ],
  edges: [
    { id: "e1", source: "user", target: "cloudfront" },
    { id: "e2", source: "cloudfront", target: "lambda" },
    { id: "e3", source: "lambda", target: "dynamo" },
  ],
};

const layout = page =>
  page.evaluate(() =>
    Object.fromEntries(
      [...document.querySelectorAll(".react-flow__node-awsNode")].map(el => [el.dataset.id, el.style.transform]),
    ),
  );

test("Arrange offers an Undo that restores the previous layout", async ({ page, baseURL }) => {
  const api = await request.newContext({ baseURL });
  const create = await api.post("/api/ai/system-designs", {
    headers: { Authorization: `Bearer ${SECRET}` },
    data: DESIGN,
  });
  expect(create.status()).toBe(201);
  const { url } = await create.json();
  const id = url.split("/?id=")[1];
  await api.patch(`/api/system-designs/${id}`, {
    headers: { Cookie: OWNER_COOKIE, "Content-Type": "application/json" },
    data: { is_public: true },
  });

  try {
    await page.goto(`/?id=${id}`);
    await page.waitForSelector(".react-flow__node-awsNode");

    const undo = page.locator("header button", { hasText: /^(Undo|Redo)$/ });
    await expect(undo).toHaveCount(0); // no permanent undo chrome in the toolbar

    const before = await layout(page);
    await page.getByRole("button", { name: "Arrange" }).click();
    await expect(undo).toHaveText("Undo");
    const arranged = await layout(page);
    expect(arranged).not.toEqual(before);

    await undo.click();
    await expect(undo).toHaveText("Redo");
    expect(await layout(page)).toEqual(before);

    await undo.click();
    await expect(undo).toHaveText("Undo");
    expect(await layout(page)).toEqual(arranged);

    // Placing a node by hand is a newer layout than the arrange, so the offer goes.
    const box = await page.locator('.react-flow__node-awsNode[data-id="user"]').boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    await expect(undo).toHaveCount(0);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});
