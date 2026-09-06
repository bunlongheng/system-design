import { describe, it, expect } from "vitest";
import { snapAlign } from "../../src/snapAlign.js";

const node = (id, x, y) => ({ id, position: { x, y }, measured: { width: 150, height: 100 } });

describe("snapAlign", () => {
  it("latches a near-miss onto the neighbour's left edge and reports a guide", () => {
    const dragged = node("a", 306, 500); // 6px off b's x
    const { position, guides } = snapAlign(dragged, [node("b", 300, 200)]);
    expect(position.x).toBe(300);
    expect(guides).toContainEqual({ axis: "x", at: 300, from: 200, to: 600 });
  });

  it("aligns both axes at once when both are within range", () => {
    const { position, guides } = snapAlign(node("a", 604, 297), [node("b", 600, 300)]);
    expect(position).toEqual({ x: 600, y: 300 });
    expect(guides).toHaveLength(2);
  });

  it("leaves the position alone when nothing is close enough", () => {
    const { position, guides } = snapAlign(node("a", 500, 500), [node("b", 900, 900)]);
    expect(position).toEqual({ x: 500, y: 500 });
    expect(guides).toEqual([]);
  });

  it("snaps to the closest line, not the first one found", () => {
    // b's right edge (450) is 4px away, c's left edge (460) is 6px away.
    const { position } = snapAlign(node("a", 454, 0), [node("b", 300, 0), node("c", 460, 0)]);
    expect(position.x).toBe(450);
  });

  it("aligns centers, so two different-width nodes stack on one axis", () => {
    const wide = { id: "b", position: { x: 280, y: 0 }, measured: { width: 190, height: 100 } };
    // wide center = 375; dragged (w 150) center at 372 -> x should become 300.
    const { position } = snapAlign(node("a", 297, 400), [wide]);
    expect(position.x).toBe(300);
  });

  it("ignores itself and nodes with no position", () => {
    const dragged = node("a", 306, 500);
    const { position } = snapAlign(dragged, [dragged, { id: "ghost" }]);
    expect(position).toEqual({ x: 306, y: 500 });
  });
});
