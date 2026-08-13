import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { signSession, verifySession, readCookie } from "../../lib/auth-session.js";

describe("session token sign/verify", () => {
  const orig = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-auth-secret-0123456789";
  });
  afterEach(() => {
    process.env.AUTH_SECRET = orig;
  });

  it("round-trips a payload", () => {
    const t = signSession({ email: "owner@example.com" });
    const s = verifySession(t);
    expect(s.email).toBe("owner@example.com");
    expect(s.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
  });

  it("rejects a tampered payload", () => {
    const t = signSession({ email: "owner@example.com" });
    const [data, sig] = t.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "attacker@example.com", exp: 9999999999 })).toString("base64url");
    expect(verifySession(`${forged}.${sig}`)).toBe(null);
    expect(verifySession(`${data}.deadbeef`)).toBe(null);
  });

  it("rejects an expired token", () => {
    const t = signSession({ email: "owner@example.com" }, -10);
    expect(verifySession(t)).toBe(null);
  });

  it("rejects when signed with a different secret", () => {
    const t = signSession({ email: "owner@example.com" });
    process.env.AUTH_SECRET = "a-totally-different-secret";
    expect(verifySession(t)).toBe(null);
  });

  it("returns null for junk / missing tokens", () => {
    expect(verifySession(null)).toBe(null);
    expect(verifySession("not-a-token")).toBe(null);
  });
});

describe("readCookie", () => {
  it("extracts a named cookie", () => {
    const req = { headers: { cookie: "a=1; sd_session=abc.def; b=2" } };
    expect(readCookie(req, "sd_session")).toBe("abc.def");
    expect(readCookie(req, "missing")).toBe(null);
    expect(readCookie({ headers: {} }, "sd_session")).toBe(null);
  });
});
