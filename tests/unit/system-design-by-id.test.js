import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the DB so the by-id handler's validation + auth can be tested without a
// real Postgres, following the create-system-design.test.js pattern.
const query = vi.fn();
vi.mock("../../lib/db.js", () => ({ default: { query: (...a) => query(...a) } }));

const { default: systemDesignById } = await import("../../lib/handlers/system-design-by-id.js");

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

// No `socket` property -> isLocal() falls through to the false branch, and
// NODE_ENV=production keeps the prod gate deterministic.
function req(method, id, auth) {
  return {
    method,
    query: { id },
    headers: { host: "system-design-bheng.vercel.app", authorization: auth },
  };
}

describe("/api/system-designs/:id", () => {
  const orig = { s: process.env.SYSTEM_DESIGNS_API_SECRET, o: process.env.OWNER_USER_ID, e: process.env.NODE_ENV };
  beforeEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = SECRET;
    process.env.OWNER_USER_ID = "731ace87-64e5-44db-bf2a-82265f06f4d9";
    process.env.NODE_ENV = "production";
    query.mockReset();
  });
  afterEach(() => {
    process.env.SYSTEM_DESIGNS_API_SECRET = orig.s;
    process.env.OWNER_USER_ID = orig.o;
    process.env.NODE_ENV = orig.e;
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

  it("GET a non-uuid id returns 400 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("GET", "abc"), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
    expect(query).not.toHaveBeenCalled();
  });

  it("DELETE a non-uuid id returns 400 and never queries the db", async () => {
    const res = mockRes();
    await systemDesignById(req("DELETE", "abc", `Bearer ${SECRET}`), res);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: "Invalid id" });
    expect(query).not.toHaveBeenCalled();
  });

  it("DELETE with a valid Bearer header returns 200 { deleted: true }", async () => {
    query.mockResolvedValueOnce({ rowCount: 1 });
    const res = mockRes();
    await systemDesignById(req("DELETE", ID, `Bearer ${SECRET}`), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ deleted: true });
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
