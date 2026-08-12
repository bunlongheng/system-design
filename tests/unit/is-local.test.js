import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isLocal } from "../../lib/is-local.js";

const req = (host) => ({ headers: { host } });

describe("isLocal", () => {
  const orig = { NODE_ENV: process.env.NODE_ENV, LOCAL_DEV: process.env.LOCAL_DEV };
  beforeEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.LOCAL_DEV;
  });
  afterEach(() => {
    process.env.NODE_ENV = orig.NODE_ENV;
    process.env.LOCAL_DEV = orig.LOCAL_DEV;
  });

  it("is true for localhost in dev", () => {
    expect(isLocal(req("localhost:5173"))).toBe(true);
    expect(isLocal(req("127.0.0.1"))).toBe(true);
    expect(isLocal(req("192.168.1.20:4321"))).toBe(true);
  });

  it("is false for an external host", () => {
    expect(isLocal(req("system-design-bheng.vercel.app"))).toBe(false);
  });

  it("is GATED OFF in production even on localhost (unless LOCAL_DEV=true)", () => {
    process.env.NODE_ENV = "production";
    expect(isLocal(req("localhost:4321"))).toBe(false);
    process.env.LOCAL_DEV = "true";
    expect(isLocal(req("localhost:4321"))).toBe(true);
  });
});
