import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { validateEnv } from "../../lib/env.js";

// The guard is only useful if something imports it on every build. It hung off
// vite.config.js, which the Next port deleted, so it silently stopped running.
const saved = { ...process.env };
afterEach(() => { for (const k of ["VERCEL_ENV", "LOCAL_DEV"]) { if (saved[k] === undefined) delete process.env[k]; else process.env[k] = saved[k]; } });

describe("production env guard", () => {
  it("is imported by next.config.mjs", () => {
    expect(readFileSync("next.config.mjs", "utf8")).toMatch(/import\s+["']\.\/lib\/env\.js["']/);
  });

  it("throws on LOCAL_DEV=true in a production build", () => {
    process.env.VERCEL_ENV = "production";
    process.env.LOCAL_DEV = "true";
    expect(() => validateEnv()).toThrow(/LOCAL_DEV/);
  });

  it("is a no-op outside production", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.LOCAL_DEV = "true";
    expect(() => validateEnv()).not.toThrow();
  });
});
