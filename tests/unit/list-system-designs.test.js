import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// Mock the DB so the list handler can be tested without a real Postgres,
// following the create-system-design.test.js pattern.
const query = vi.fn();
vi.mock("../../lib/db.js", () => ({ default: { query: (...a) => query(...a) } }));

const { default: listSystemDesigns } = await import("../../lib/handlers/list-system-designs.js");

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

describe("GET /api/system-designs (list)", () => {
  const orig = { o: process.env.OWNER_USER_ID };
  beforeEach(() => {
    process.env.OWNER_USER_ID = "731ace87-64e5-44db-bf2a-82265f06f4d9";
    query.mockReset();
  });
  afterEach(() => {
    process.env.OWNER_USER_ID = orig.o;
  });

  it("GET returns 200 with the array from db.query", async () => {
    const rows = [{ id: "11111111-1111-1111-1111-111111111111", title: "X" }];
    query.mockResolvedValueOnce({ rows });
    const res = mockRes();
    await listSystemDesigns({ method: "GET" }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual(rows);
  });

  it("a non-GET method returns 405", async () => {
    const res = mockRes();
    await listSystemDesigns({ method: "POST" }, res);
    expect(res.statusCode).toBe(405);
    expect(query).not.toHaveBeenCalled();
  });

  it("returns 500 when OWNER_USER_ID is unset", async () => {
    delete process.env.OWNER_USER_ID;
    const res = mockRes();
    await listSystemDesigns({ method: "GET" }, res);
    expect(res.statusCode).toBe(500);
    expect(query).not.toHaveBeenCalled();
  });
});
