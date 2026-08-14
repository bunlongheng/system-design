// @vitest-environment jsdom
import { describe, it, expect, afterEach } from "vitest";
import { render, cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { DiagramMinimap } from "../../src/components/DiagramMinimap.jsx";

afterEach(cleanup);

describe("DiagramMinimap", () => {
  it("renders an svg with a rect per node for a 2-node diagram", () => {
    const diagram = {
      nodes: [
        { id: "a", position: { x: 0, y: 0 } },
        { id: "b", position: { x: 100, y: 100 } },
      ],
      edges: [{ source: "a", target: "b" }],
    };
    const { container } = render(<DiagramMinimap diagram={diagram} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(container.querySelectorAll("rect").length).toBe(2);
  });
});
