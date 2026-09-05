import { test, expect, request } from "@playwright/test";
import { signSession } from "../../lib/auth-session.js";

// Browser e2e for Cmd/Ctrl + drag snap-align: prove that holding the modifier
// while dragging paints the yellow guide AND that the node actually lands on the
// neighbour's line when released (the release is the part that silently breaks
// if the snap is applied to the node instead of to the position change).
const SECRET = process.env.SYSTEM_DESIGNS_API_SECRET || "e2e-secret";
const OWNER_COOKIE = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;

const DESIGN = {
  title: "E2E Snap Align",
  type: "system-design",
  nodes: [
    { id: "user", position: { x: 100, y: 100 } },
    { id: "lambda", position: { x: 500, y: 420 } },
  ],
  edges: [{ id: "e1", source: "user", target: "lambda", label: "invoke" }],
};

// React Flow writes positions as `transform: translate(Xpx, Ypx)` on the node.
const flowY = async locator => {
  const t = await locator.evaluate(el => el.style.transform);
  return Number(t.match(/translate\((-?[\d.]+)px,\s*(-?[\d.]+)px\)/)[2]);
};

test("Cmd + drag snaps a node onto its neighbour's line and shows a yellow guide", async ({ page, baseURL }) => {
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

    const anchor = page.locator('.react-flow__node-awsNode[data-id="user"]');
    const moving = page.locator('.react-flow__node-awsNode[data-id="lambda"]');
    const anchorY = await flowY(anchor);
    expect(await flowY(moving)).not.toBe(anchorY);

    const zoom = await page.evaluate(() =>
      Number(document.querySelector(".react-flow__viewport").style.transform.match(/scale\(([\d.]+)\)/)[1]),
    );
    const box = await moving.boundingBox();
    const grab = { x: box.x + box.width / 2, y: box.y + 8 };

    // Phase 1 - plain drag most of the way up, no modifier, so nothing snaps.
    await page.mouse.move(grab.x, grab.y);
    await page.mouse.down();
    await page.mouse.move(grab.x, grab.y - (await flowY(moving)) * zoom * 0.9, { steps: 10 });

    // Phase 2 - measure where the un-snapped drag actually sits, then nudge to
    // 4px shy of the anchor's line with Cmd held. Measuring beats computing the
    // screen delta up front: React Flow auto-pans near the canvas edge.
    const off = (await flowY(moving)) - anchorY;
    await page.keyboard.down("Meta");
    const now = await moving.boundingBox();
    await page.mouse.move(now.x + now.width / 2, now.y + 8 - (off - 4) * zoom, { steps: 8 });

    // The yellow guide is on screen while the snap is engaged.
    await expect(page.locator(".sd-snap-guide")).toHaveCount(1);

    await page.mouse.up();
    await page.keyboard.up("Meta");

    // ...and it lands exactly on the anchor's line, then the guide goes away.
    expect(await flowY(moving)).toBe(anchorY);
    await expect(page.locator(".sd-snap-guide")).toHaveCount(0);
  } finally {
    await api.delete(`/api/system-designs/${id}`, { headers: { Cookie: OWNER_COOKIE } });
    await api.dispose();
  }
});
