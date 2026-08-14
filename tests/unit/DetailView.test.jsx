// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { ReactFlowProvider } from "@xyflow/react";
import { DetailView } from "../../src/views/DetailView.jsx";

afterEach(cleanup);

// jsdom has no ResizeObserver, but @xyflow/react needs one to mount its canvas.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = global.ResizeObserver || ResizeObserverStub;

const sampleDiagram = {
  id: "d1",
  title: "IFTTT System Design",
  data: { nodes: [{ id: "user", position: { x: 0, y: 0 } }], edges: [] },
  updatedAt: new Date().toISOString(),
  tags: ["API"],
};

function setup(overrides = {}) {
  const props = {
    toast: { message: "", visible: false },
    setView: vi.fn(),
    showDetailCode: false,
    setShowDetailCode: vi.fn(),
    rfInstance: { current: null },
    flashZoomHud: vi.fn(),
    zoomHudRef: { current: null },
    showSharePanel: false,
    setShowSharePanel: vi.fn(),
    activeDiagram: sampleDiagram,
    detailCodeCopied: false,
    setDetailCodeCopied: vi.fn(),
    nodes: [{ id: "user", position: { x: 0, y: 0 }, data: {} }],
    edges: [],
    exportPng: vi.fn(),
    exportCode: vi.fn(),
    exportJson: vi.fn(),
    copyLink: vi.fn(),
    copiedLink: false,
    shareAction: vi.fn(),
    copiedShare: false,
    copyCode: vi.fn(),
    copiedCode: false,
    showDocs: false,
    setShowDocs: vi.fn(),
    copiedLabel: "",
    onCopyFormat: vi.fn(),
    ...overrides,
  };
  render(
    <ReactFlowProvider>
      <DetailView {...props} />
    </ReactFlowProvider>
  );
  return props;
}

describe("DetailView", () => {
  it("renders without crashing and shows the back button", () => {
    setup();
    expect(document.querySelector("header")).toBeInTheDocument();
  });

  it("shows the Code and Share toolbar toggles", () => {
    setup();
    expect(screen.getByText("Code")).toBeInTheDocument();
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("shows the Fit button", () => {
    setup();
    expect(screen.getByText("Fit")).toBeInTheDocument();
  });

  it("goes back to the index view and hides the code panel when back is clicked", async () => {
    const { setView, setShowDetailCode } = setup();
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button")[0]);
    expect(setView).toHaveBeenCalledWith("index");
    expect(setShowDetailCode).toHaveBeenCalledWith(false);
  });

  it("toggles the code panel when the Code button is clicked", async () => {
    const { setShowDetailCode } = setup();
    const user = userEvent.setup();
    await user.click(screen.getByText("Code"));
    expect(setShowDetailCode).toHaveBeenCalled();
  });
});
