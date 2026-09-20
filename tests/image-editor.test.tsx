// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ImageEditor } from "@/components/image-editor";
import { mockImageSize, mockCanvas, mockViewportSize, mockObjectURLs } from "./support/jsdom";

beforeEach(() => {
  mockObjectURLs();
  // 1200x800 photo inside a 400x400 square viewport.
  mockImageSize(1200, 800);
  mockViewportSize(400, 400);
});

async function openEditor(props?: Partial<React.ComponentProps<typeof ImageEditor>>) {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ImageEditor src="blob:original" outputSize={400} onConfirm={onConfirm} onCancel={onCancel} {...props} />);
  await waitFor(() => expect(screen.getByRole("button", { name: "Use photo" })).toBeEnabled());
  return { onConfirm, onCancel };
}

describe("ImageEditor", () => {
  it("exports a cover-fit crop mirroring the on-screen transform", async () => {
    const { calls } = mockCanvas();
    const { onConfirm } = await openEditor();

    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));

    await waitFor(() => expect(onConfirm).toHaveBeenCalledTimes(1));
    const blob = onConfirm.mock.calls[0][0] as Blob;
    expect(blob.type).toBe("image/jpeg");
    // Canvas is 400x400 for the square aspect.
    expect(calls.canvasSize).toEqual([{ w: 400, h: 400 }]);
    // Centered, unrotated, unscaled: cover = max(400/1200, 400/800) = 0.5 → 600x400.
    expect(calls.translate).toEqual([[200, 200]]);
    expect(calls.rotate).toEqual([0]);
    expect(calls.scale).toEqual([[1, 1]]);
    const [, dx, dy, dw, dh] = calls.drawImage[0] as [unknown, number, number, number, number];
    expect([dx, dy, dw, dh]).toEqual([-300, -200, 600, 400]);
  });

  it("applies zoom and pan to the export", async () => {
    const { calls } = mockCanvas();
    await openEditor();
    const slider = screen.getByLabelText("Zoom");
    fireEvent.change(slider, { target: { value: "2" } });

    // Drag right by 60px: maxX = (600*2 - 400)/2 = 400, so it sticks.
    const viewport = document.querySelector(".no-touch") as HTMLElement;
    fireEvent.pointerDown(viewport, { clientX: 200, clientY: 200 });
    fireEvent.pointerMove(viewport, { clientX: 260, clientY: 200 });
    fireEvent.pointerUp(viewport);

    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));
    expect(calls.scale).toEqual([[2, 2]]);
    expect(calls.translate).toEqual([[260, 200]]);
  });

  it("rotates the export and keeps cover-fit", async () => {
    const { calls } = mockCanvas();
    await openEditor();
    const rotateButtons = screen.getAllByRole("button", { name: "Rotate" });
    fireEvent.click(rotateButtons[1]);

    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));
    expect(calls.rotate).toEqual([Math.PI / 2]);
    // Rotated dims 800x1200 → cover 0.5 → base 600x400, drawn centered.
    const [, dx, dy, dw, dh] = calls.drawImage[0] as [unknown, number, number, number, number];
    expect([dx, dy, dw, dh]).toEqual([-300, -200, 600, 400]);
  });

  it("switches aspect ratios for the export", async () => {
    const { calls } = mockCanvas();
    await openEditor({ aspects: [{ label: "Square", value: 1 }, { label: "Wide", value: 2 }] });
    fireEvent.click(screen.getByRole("button", { name: "Wide" }));
    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));
    expect(calls.canvasSize).toEqual([{ w: 400, h: 200 }]);
  });

  it("shows the circular avatar mask in circle mode", async () => {
    mockCanvas();
    await openEditor({ shape: "circle" });
    expect(document.querySelector(".border-dashed")).not.toBeNull();
  });

  it("cancels without confirming", async () => {
    mockCanvas();
    const { onConfirm, onCancel } = await openEditor();
    const cancels = screen.getAllByRole("button", { name: "Cancel" });
    fireEvent.click(cancels[cancels.length - 1]);
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
