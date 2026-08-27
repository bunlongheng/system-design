// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { DiagramCard } from "../../src/components/DiagramCard.jsx";

afterEach(cleanup);

const diagram = { nodes: [{ id: "user", position: { x: 0, y: 0 } }], edges: [] };

function setup(overrides = {}) {
  const onOpen = vi.fn();
  const onViewCode = vi.fn();
  const onDelete = vi.fn();
  render(
    <DiagramCard
      diagram={diagram}
      title="Netflix"
      updatedAt={new Date()}
      tags={["aws"]}
      onOpen={onOpen}
      onViewCode={onViewCode}
      onDelete={onDelete}
      {...overrides}
    />
  );
  return { onOpen, onViewCode, onDelete };
}

describe("DiagramCard", () => {
  it("renders the title and the node / edge counts", () => {
    setup();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("1 node")).toBeInTheDocument();
    expect(screen.getByText("0 edges")).toBeInTheDocument();
  });

  it("calls onOpen when the card is clicked", async () => {
    const { onOpen } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /open netflix/i }));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("calls onOpen when Enter is pressed on the card", async () => {
    const { onOpen } = setup();
    const card = screen.getByRole("button", { name: /open netflix/i });
    card.focus();
    const user = userEvent.setup();
    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("requires a second click on the confirm control before calling onDelete", async () => {
    const { onDelete } = setup();
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: /delete\?/i }));
    expect(onDelete).toHaveBeenCalledTimes(1);
  });
});
