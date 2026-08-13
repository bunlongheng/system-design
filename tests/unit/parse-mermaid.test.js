import { describe, it, expect } from "vitest";
import { parseMermaid } from "../../src/parseMermaid.js";

describe("parseMermaid", () => {
  it("parses a labeled edge into 2 nodes and 1 edge with the right ids/labels", () => {
    const { nodes, edges } = parseMermaid("graph LR\nA[Foo] -->|calls| B[Bar]");
    expect(nodes.length).toBe(2);
    expect(edges.length).toBe(1);

    const a = nodes.find((n) => n.id === "A");
    const b = nodes.find((n) => n.id === "B");
    expect(a.data.label).toBe("Foo");
    expect(b.data.label).toBe("Bar");

    expect(edges[0].source).toBe("A");
    expect(edges[0].target).toBe("B");
    expect(edges[0].label).toBe("calls");
  });

  it("parses an unlabeled edge with an empty label", () => {
    const { nodes, edges } = parseMermaid("graph TD\nA --> B");
    expect(nodes.length).toBe(2);
    expect(edges.length).toBe(1);
    expect(edges[0].source).toBe("A");
    expect(edges[0].target).toBe("B");
    expect(edges[0].label).toBeUndefined();
  });

  it("parses a standalone node line", () => {
    const { nodes, edges } = parseMermaid("graph LR\nC[Baz]");
    expect(nodes.length).toBe(1);
    expect(edges.length).toBe(0);
    expect(nodes[0].id).toBe("C");
    expect(nodes[0].data.label).toBe("Baz");
  });

  it("returns empty nodes/edges for empty input", () => {
    const { nodes, edges } = parseMermaid("");
    expect(nodes).toEqual([]);
    expect(edges).toEqual([]);
  });

  it("ignores junk/non-matching lines", () => {
    const { nodes, edges } = parseMermaid("graph LR\nthis is not valid mermaid syntax !!!\n%% a comment");
    expect(nodes.length).toBe(0);
    expect(edges.length).toBe(0);
  });

  it("assigns dagre-computed positions as numbers", () => {
    const { nodes } = parseMermaid("graph LR\nA[Foo] -->|calls| B[Bar]");
    for (const n of nodes) {
      expect(typeof n.position.x).toBe("number");
      expect(typeof n.position.y).toBe("number");
      expect(Number.isNaN(n.position.x)).toBe(false);
      expect(Number.isNaN(n.position.y)).toBe(false);
    }
  });
});
