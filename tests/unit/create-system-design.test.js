import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the DB so the create handler's validation + auth can be tested without a
// real Postgres. First query() (slug lookup) returns no collisions; second
// (INSERT) returns a fixed id.
const query = vi.fn();
vi.mock("../../lib/db.js", () => ({ default: { query: (...a) => query(...a) } }));

const { default: createSystemDesign } = await import("../../lib/handlers/create-system-design.js");

function mockRes() {
  return {
    statusCode: 0,
    body: null,
    status(c) {
      this.statusCode = c;
      return this;
    },
    json(b) {
      this.body = b;
      return this;
    },
  };
}

const SECRET = "test-secret-abc123";
const ID = "11111111-1111-1111-1111-111111111111";
const good = (auth, body) => ({ method: "POST", headers: { host: "system-design-bheng.vercel.app", authorization: auth }, body });
const VALID_BODY = {
  title: "Netflix System Design",
  nodes: [{ id: "user", position: { x: 40, y: 200 } }, { id: "cloudfront", position: { x: 260, y: 200 } }],
  edges: [{ id: "e1", source: "user", target: "cloudfront" }],
};

describe("POST /api/ai/system-designs (public render-only)", () => {
  const orig = { s: process.env.SYSTEM_DESIGNS_API_SECRET, o: process.env.OWNER_USER_ID };
  beforeEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = SECRET;
    process.env.OWNER_USER_ID = "731ace87-64e5-44db-bf2a-82265f06f4d9";
    query.mockReset();
  });
  afterEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = orig.s;
    process.env.OWNER_USER_ID = orig.o;
  });

  it("401s without a Bearer token", async () => {
    const res = mockRes();
    await createSystemDesign(good(undefined, VALID_BODY), res);
    expect(res.statusCode).toBe(401);
    expect(query).not.toHaveBeenCalled();
  });

  it("400s (with a sample_request) when title is missing", async () => {
    const res = mockRes();
    await createSystemDesign(good(`Bearer ${SECRET}`, { nodes: VALID_BODY.nodes }), res);
    expect(res.statusCode).toBe(400);
    expect(res.body.sample_request).toBeTruthy();
    expect(query).not.toHaveBeenCalled();
  });

  it("400s when nodes is empty", async () => {
    const res = mockRes();
    await createSystemDesign(good(`Bearer ${SECRET}`, { title: "x", nodes: [] }), res);
    expect(res.statusCode).toBe(400);
  });

  it("400s for an unsupported type", async () => {
    const res = mockRes();
    await createSystemDesign(good(`Bearer ${SECRET}`, { ...VALID_BODY, type: "sequence" }), res);
    expect(res.statusCode).toBe(400);
  });

  it("201s with a url on a valid request (parameterized INSERT)", async () => {
    query.mockResolvedValueOnce({ rows: [] }); // slug lookup: no collisions
    query.mockResolvedValueOnce({ rows: [{ id: ID }] }); // insert
    const res = mockRes();
    await createSystemDesign(good(`Bearer ${SECRET}`, VALID_BODY), res);
    expect(res.statusCode).toBe(201);
    expect(res.body.url).toContain(ID);
    // INSERT must be parameterized (values passed separately, not interpolated).
    const insertCall = query.mock.calls[1];
    expect(insertCall[0]).toMatch(/INSERT INTO system_designs/);
    expect(Array.isArray(insertCall[1])).toBe(true);
  });
});
