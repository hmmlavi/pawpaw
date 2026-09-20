// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/content", () => ({ createPostAction: vi.fn() }));
vi.mock("@/actions/ai", () => ({
  sendAiMessageAction: vi.fn(),
  aiConfiguredAction: vi.fn(async () => ({ configured: false })),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/home",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { Composer } from "@/components/composer";
import { createPostAction } from "@/actions/content";
import { mockImageSize, mockCanvas, mockViewportSize, mockObjectURLs } from "./support/jsdom";

beforeEach(() => {
  mockObjectURLs();
  mockImageSize(1200, 800);
  mockViewportSize(400, 400);
  vi.mocked(createPostAction).mockResolvedValue({ ok: true, postId: "post-1" });
});

const png = (name: string) => new File(["photo-bytes"], name, { type: "image/png" });

function pickFiles(...files: File[]) {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe("Composer media", () => {
  it("keeps earlier previews alive when more photos are added", () => {
    render(<Composer kind="post" petName="Bruno" city="Lisbon" onClose={() => {}} />);
    pickFiles(png("one.png"));
    expect(document.querySelectorAll("img").length).toBe(1);
    const firstSrc = (document.querySelector("img") as HTMLImageElement).src;

    pickFiles(png("two.png"));
    const imgs = document.querySelectorAll("img");
    expect(imgs.length).toBe(2);
    // The first preview URL must survive — it was revoked in an earlier revision.
    expect((imgs[0] as HTMLImageElement).src).toBe(firstSrc);
    expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(firstSrc);
  });

  it("adjusts a photo through the editor and can revert to the original", async () => {
    mockCanvas();
    render(<Composer kind="post" petName="Bruno" city="Lisbon" onClose={() => {}} />);
    pickFiles(png("one.png"));

    fireEvent.click(screen.getByRole("button", { name: "Adjust photo" }));
    expect(await screen.findByText("Square")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Use photo" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));

    expect(await screen.findByText("Adjusted")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Revert to original" }));
    await waitFor(() => expect(screen.queryByText("Adjusted")).toBeNull());
  });

  it("publishes every attached photo with the caption", async () => {
    mockCanvas();
    const onClose = vi.fn();
    render(<Composer kind="post" petName="Bruno" city="Lisbon" onClose={onClose} />);
    pickFiles(png("one.png"), png("two.png"));
    fireEvent.change(screen.getByPlaceholderText(/caption/i), { target: { value: "Beach day!" } });

    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    await waitFor(() => expect(createPostAction).toHaveBeenCalledTimes(1));
    const fd = vi.mocked(createPostAction).mock.calls[0][0] as FormData;
    expect(fd.get("caption")).toBe("Beach day!");
    expect(fd.getAll("media")).toHaveLength(2);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("requires at least one photo for a post", async () => {
    const { toast } = await import("sonner");
    render(<Composer kind="post" petName="Bruno" city="Lisbon" onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Publish" }));
    expect(createPostAction).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
  });
});
