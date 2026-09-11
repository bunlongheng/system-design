import { describe, it, expect } from "vitest";
import { validateDesign, okCustomIcon, okColor, MAX_NODES } from "../../lib/validate-design.js";

// One policy for the 3 doors that write a diagram (API, MCP, AI generate).
describe("okCustomIcon", () => {
  it("accepts a same-origin asset path, https, and a well-formed data:image URI", () => {
    for (const ic of ["/brand/x.svg", "/icons/aws/s3.png", "https://cdn.example.com/logo.png", "data:image/png;base64,iVBORw0KGgo=", "data:image/svg+xml,%3Csvg"]) {
      expect(okCustomIcon(ic), ic).toBe(true);
    }
  });
  it("rejects protocol-relative, script, http, unknown image types and non-assets", () => {
    for (const ic of ["//evil.example/logo.svg", "javascript:alert(1)", "http://x/y.png", "data:image/bmp;base64,AAAA", "data:image/png", "/brand/../../etc/passwd", "/brand/x.html", 42, ""]) {
      expect(okCustomIcon(ic), String(ic)).toBe(false);
    }
  });
});

describe("okColor", () => {
  it("is a 6-digit hex or nothing (it lands in SVG attributes)", () => {
    expect(okColor("#FE5100")).toBe(true);
    for (const c of ['red', '#fff', '#FE5100" onload="x', "", null]) expect(okColor(c), String(c)).toBe(false);
  });
});

describe("validateDesign", () => {
  it("passes a catalog node and a bring-your-own icon", () => {
    expect(validateDesign({ nodes: [{ id: "user" }, { id: "hub", icon: "/brand/hubspot.svg", label: "HubSpot" }], edges: [{ source: "user", target: "hub" }] })).toBeNull();
  });
  it("names every unresolved node once", () => {
    const v = validateDesign({ nodes: [{ id: "ghost" }, { id: "ghost" }, { id: "user" }, { id: "x", icon: "//evil/x.svg" }], edges: [] });
    expect(v.unresolved).toEqual(["ghost", "x"]);
    expect(v.error).toMatch(/real logo/);
  });
  it("enforces the icon size and node/edge caps", () => {
    expect(validateDesign({ nodes: [{ id: "a", icon: "data:image/png;base64," + "A".repeat(24001) }], edges: [] }).error).toMatch(/too large/);
    expect(validateDesign({ nodes: Array.from({ length: MAX_NODES + 1 }, () => ({ id: "user" })), edges: [] }).error).toMatch(/too many nodes/);
    expect(validateDesign({ nodes: [{ id: "user" }], edges: [{ source: "user" }] }).error).toMatch(/source.*target/);
  });
});
