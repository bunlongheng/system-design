import { describe, it, expect } from "vitest";
import { renderOgSvg, OG_W, OG_H } from "../../lib/render-og.js";
import { tierFor } from "../../src/difficulty.js";

const DESIGN = {
  title: "Email Newsletter - 500M Subscribers",
  pattern: "Bulk fan-out: shard the audience, queue per shard",
  difficulty: 4,
  nodes: [
    { id: "client", position: { x: 0, y: 0 } },
    { id: "ses", position: { x: 300, y: 0 } },
    { id: "redis", position: { x: 600, y: 0 } },
  ],
  edges: [
    { source: "client", target: "ses", label: "send" },
    { source: "ses", target: "redis", label: "suppress" },
  ],
};

describe("renderOgSvg", () => {
  // The share card and the gallery card MUST agree. They were separate copies and
  // had already drifted: the card's table stopped at 10, so the two hardest demos
  // (ranks 11 and 12) shipped with no difficulty chip at all.
  it("shows a difficulty chip for every rank the gallery ranks, 1 through 12", () => {
    for (let d = 1; d <= 12; d++) {
      const svg = renderOgSvg({ ...DESIGN, difficulty: d });
      const expected = tierFor(d).label;
      expect(svg, `rank ${d} should chip as ${expected}`).toContain(expected);
    }
  });

  it("shows no chip when a design is unranked", () => {
    const svg = renderOgSvg({ ...DESIGN, difficulty: null });
    for (const label of ["Easy", "Medium", "Hard", "Expert"]) expect(svg).not.toContain(label);
  });

  it("renders a 1200x630 card carrying the title and the pattern line", () => {
    const svg = renderOgSvg(DESIGN);
    expect(svg).toContain(`width="${OG_W}" height="${OG_H}"`);
    expect(svg).toContain("Email Newsletter - 500M Subscribers");
    expect(svg).toContain("Bulk fan-out");
    expect(svg).toContain("SYSTEM DESIGN");
  });

  it("shows the node and edge counts plus a difficulty chip", () => {
    const svg = renderOgSvg(DESIGN);
    expect(svg).toContain("3 nodes");
    expect(svg).toContain("2 edges");
    expect(svg).toContain("Medium");
  });

  it("nests the diagram itself, so the card previews the real design", () => {
    const svg = renderOgSvg(DESIGN);
    // A nested <svg> with its own viewBox is the diagram render.
    expect(svg.match(/<svg/g).length).toBeGreaterThan(1);
    expect(svg).toContain('preserveAspectRatio="xMidYMid meet"');
  });

  it("drops the Destination pill so the card matches what the app draws", () => {
    const svg = renderOgSvg({ ...DESIGN, nodes: [...DESIGN.nodes] });
    expect(svg).toContain("Start here");
    expect(svg).not.toContain("Destination");
  });

  it("uses the real-world brand logo when the title has one", () => {
    const withBrand = renderOgSvg({ ...DESIGN, title: "Bitly" });
    const without = renderOgSvg({ ...DESIGN, title: "Something Unbranded" });
    expect(withBrand).toContain("<image x=");
    expect(withBrand.match(/<image /g).length).toBeGreaterThan(without.match(/<image /g).length);
  });

  it("escapes markup in a title instead of emitting it", () => {
    const svg = renderOgSvg({ ...DESIGN, title: '<script>x</script> & "co"' });
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
  });

  it("survives a design with no nodes rather than throwing", () => {
    const svg = renderOgSvg({ title: "Empty", nodes: [], edges: [] });
    expect(svg).toContain(`width="${OG_W}"`);
    expect(svg).toContain("0 nodes");
  });
});
