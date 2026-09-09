import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { signSession } from "../../lib/auth-session.js";

// Mock the DB so the by-id handler's validation + auth can be tested without a
// real Postgres, following the create-system-design.test.js pattern.
const query = vi.fn();
vi.mock("../../lib/db.js", () => ({ default: { query: (...a) => query(...a) } }));

const { default: systemDesignById } = await import("../../lib/handlers/system-design-by-id.js");

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    headers: {},
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
  };
}

const SECRET = "test-secret-abc123";
const ID = "11111111-1111-1111-1111-111111111111";
const OWNER_EMAIL = "owner@example.com";

// No `socket` property -> isLocal() falls through to the false branch, and
// NODE_ENV=production keeps the prod gate deterministic.
function req(method, id, auth, cookie, extraQuery = {}) {
  return {
    method,
    query: { id, ...extraQuery },
    headers: { host: "system-design-bheng.vercel.app", authorization: auth, cookie },
  };
}

describe("/api/system-designs/:id", () => {
  const orig = {
    s: process.env.SYSTEM_DESIGNS_API_SECRET,
    o: process.env.OWNER_USER_ID,
    e: process.env.NODE_ENV,
    a: process.env.AUTH_SECRET,
    oe: process.env.OWNER_EMAIL,
  };
  beforeEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = SECRET;
    process.env.OWNER_USER_ID = "731ace87-64e5-44db-bf2a-82265f06f4d9";
    process.env.NODE_ENV = "production";
    process.env.AUTH_SECRET = "test-auth-secret";
    process.env.OWNER_EMAIL = OWNER_EMAIL;
    query.mockReset();
  });
  afterEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = orig.s;
    process.env.OWNER_USER_ID = orig.o;
    process.env.NODE_ENV = orig.e;
    process.env.AUTH_SECRET = orig.a;
    process.env.OWNER_EMAIL = orig.oe;
  });

  it("GET returns 200 with the row for a valid uuid that exists", async () => {
    const row = { id: ID, title: "Netflix", nodes: [], edges: [] };
    query.mockResolvedValueOnce({ rows: [row] });
    const res = mockRes();
    await systemDesignById(req("GET", ID), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(row);
  });

  it("GET returns 404 for a valid uuid that does not exist", async () => {
    query.mockResolvedValueOnce({ rows: [] });
    const res = mockRes();
    await systemDesignById(req("GET", ID), res);
    expect(res.statusCode).toBe(404);
  });

  // A non-uuid GET is a SLUG lookup now - that is how /?name=my-design resolves.
  // Resolving it by scanning the list endpoints instead was the bug that made a
  // published non-demo design 404 on its own share link.
  it("GET a slug looks the design up by slug, not by id", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID, slug: "my-design", is_public: true }] });
    const res = mockRes();
    await systemDesignById(req("GET", "my-design"), res);
    expect(res.statusCode).toBe(200);
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/WHERE slug = \$1/);
    expect(params).toEqual(["my-design"]);
  });

  it("GET a malformed slug returns 400 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("GET", "not a slug!"), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
    expect(query).not.toHaveBeenCalled();
  });

  // Mutations stay uuid-only even for a well-formed slug: a slug changes meaning
  // when a design is renamed, so it is not a safe thing to delete or overwrite by.
  it("DELETE by slug returns 400 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("DELETE", "my-design", `Bearer ${SECRET}`), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
    expect(query).not.toHaveBeenCalled();
  });

  it("PATCH view_state keeps the whole set of open panels, not one winner", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const cookie = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;
    const r = req("PATCH", ID, undefined, cookie);
    r.body = { view_state: { panels: ["details", "steps"], badge: "silver" } };
    await systemDesignById(r, res);
    expect(res.statusCode).toBe(200);
    // Order is normalised to the canonical list, and both survive.
    expect(res.body.view_state).toEqual({ panels: ["steps", "details"], badge: "silver" });
  });

  it("PATCH view_state drops anything not a real panel or badge", async () => {
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const cookie = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;
    const r = req("PATCH", ID, undefined, cookie);
    r.body = { view_state: { panels: ["steps", "evil", 1], badge: "neon" } };
    await systemDesignById(r, res);
    expect(res.body.view_state).toEqual({ panels: ["steps"], badge: null });
  });

  // A layout save must move nodes and nothing else. Replacing the array with the
  // client's copy let a tab left open across a change write its stale nodes back
  // on the next drag - a low-res logo that had just been backfilled away came
  // back seven minutes later.
  it("PATCH nodes takes ONLY position and keeps stored branding", async () => {
    const stored = [
      { id: "integry", label: "Integry", color: "#ef4444", sub: "DECOMMISSION", position: { x: 0, y: 0 } },
    ];
    query.mockResolvedValueOnce({ rows: [{ nodes: stored }] });
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const r = req("PATCH", ID, undefined, `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`);
    // A stale client sends the OLD inline icon back alongside the new position.
    r.body = { nodes: [{ id: "integry", position: { x: 500, y: 250 }, icon: "data:image/png;base64,STALE", color: "#000000" }] };
    await systemDesignById(r, res);

    const written = JSON.parse(query.mock.calls[1][1][0]);
    expect(written[0].position).toEqual({ x: 500, y: 250 }); // the move lands
    expect(written[0].icon).toBeUndefined();                 // the stale icon does not
    expect(written[0].color).toBe("#ef4444");                // stored branding wins
    expect(written[0].sub).toBe("DECOMMISSION");
  });

  it("PATCH nodes still accepts a genuinely new node whole", async () => {
    query.mockResolvedValueOnce({ rows: [{ nodes: [{ id: "a", position: { x: 0, y: 0 } }] }] });
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const r = req("PATCH", ID, undefined, `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`);
    r.body = { nodes: [{ id: "brand-new", position: { x: 9, y: 9 }, icon: "/brand/x.png", label: "New" }] };
    await systemDesignById(r, res);
    const written = JSON.parse(query.mock.calls[1][1][0]);
    const added = written.find((n) => n.id === "brand-new");
    expect(added).toEqual({ id: "brand-new", position: { x: 9, y: 9 }, icon: "/brand/x.png", label: "New" });
    expect(written.find((n) => n.id === "a")).toBeTruthy(); // untouched node survives
  });

  // Dragged step-badge positions. Merged BY EDGE ID into the stored edges, so a
  // stale or malicious client cannot drop labels or rewrite endpoints.
  it("PATCH edges merges label offsets and never touches label or endpoints", async () => {
    const stored = [
      { id: "e1", source: "a", target: "b", label: "first" },
      { id: "e2", source: "b", target: "c", label: "second", labelOffset: { dx: 5, dy: 5 } },
    ];
    query.mockResolvedValueOnce({ rows: [{ edges: stored }] });
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const r = req("PATCH", ID, undefined, `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`);
    // e1 gets an offset; e2's is reset; the caller sends no label or endpoints.
    r.body = { edges: [{ id: "e1", labelOffset: { dx: 12.6, dy: -40.2 } }, { id: "e2" }] };
    await systemDesignById(r, res);
    expect(res.statusCode).toBe(200);

    const written = JSON.parse(query.mock.calls[1][1][0]);
    expect(written[0]).toEqual({ id: "e1", source: "a", target: "b", label: "first", labelOffset: { dx: 13, dy: -40 } });
    // Reset drops the offset entirely rather than storing a zero.
    expect(written[1]).toEqual({ id: "e2", source: "b", target: "c", label: "second" });
    expect(res.body.moved).toBe(1);
  });

  it("PATCH edges ignores a non-finite offset instead of storing NaN", async () => {
    query.mockResolvedValueOnce({ rows: [{ edges: [{ id: "e1", source: "a", target: "b" }] }] });
    query.mockResolvedValueOnce({ rows: [{ id: ID }] });
    const res = mockRes();
    const r = req("PATCH", ID, undefined, `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`);
    r.body = { edges: [{ id: "e1", labelOffset: { dx: "x", dy: null } }] };
    await systemDesignById(r, res);
    expect(JSON.parse(query.mock.calls[1][1][0])[0].labelOffset).toBeUndefined();
  });

  it("DELETE is a SOFT delete: stamps deleted_at and says it is recoverable", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = mockRes();
    const cookie = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;
    await systemDesignById(req("DELETE", ID, undefined, cookie), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deleted: true, recoverable: true });
    // The row is updated, never removed.
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/UPDATE system_designs SET deleted_at = now\(\)/);
    expect(sql).not.toMatch(/DELETE FROM/);
  });

  it("DELETE ?purge=1 hard-deletes, and ONLY a row already in trash", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = mockRes();
    const cookie = `sd_session=${signSession({ email: process.env.OWNER_EMAIL })}`;
    await systemDesignById(req("DELETE", ID, undefined, cookie, { purge: "1" }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ purged: true });
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/DELETE FROM system_designs/);
    // The guard that makes destroying anything take two deliberate steps.
    expect(sql).toMatch(/deleted_at IS NOT NULL/);
  });

  it("DELETE with a valid Bearer header (no owner session) returns 401 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("DELETE", ID, `Bearer ${SECRET}`), res);
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("DELETE with no Bearer (and not local) returns 401 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("DELETE", ID), res);
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("DELETE with a bad Bearer (and not local) returns 401 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("DELETE", ID, "Bearer wrong-secret-1234"), res);
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("PUT on a valid uuid returns 405", async () => {
    const res = mockRes();
    await systemDesignById(req("PUT", ID), res);
    expect(res.statusCode).toBe(405);
  });
});
