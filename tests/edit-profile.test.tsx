// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/actions/pets", () => ({ updatePetAction: vi.fn() }));
vi.mock("@/actions/content", () => ({
  toggleBlockAction: vi.fn(),
  respondFollowRequestAction: vi.fn(),
  removeFollowerAction: vi.fn(),
  followAction: vi.fn(),
  getCommentsAction: vi.fn(async () => []),
  addCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  toggleCommentLikeAction: vi.fn(),
  toggleLikeAction: vi.fn(),
  toggleSaveAction: vi.fn(),
  toggleRepostAction: vi.fn(),
  deletePostAction: vi.fn(),
  updatePostCaptionAction: vi.fn(),
  reportAction: vi.fn(),
}));
vi.mock("@/actions/messages", () => ({ openConversationAction: vi.fn() }));
vi.mock("@/actions/ai", () => ({
  sendAiMessageAction: vi.fn(),
  aiConfiguredAction: vi.fn(async () => ({ configured: false })),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/profile/bruno",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { EditProfileModal, type EditablePet } from "@/components/profile";
import { updatePetAction } from "@/actions/pets";
import { mockImageSize, mockCanvas, mockViewportSize, mockObjectURLs } from "./support/jsdom";

const pet: EditablePet = {
  id: "pet-bruno",
  name: "Bruno",
  username: "bruno",
  icon: "dog",
  avatar: "/api/file/avatar-1",
  animalType: "dog",
  city: "Lisbon",
  isPrivate: false,
  starBadge: false,
  birthday: null,
  bio: "Good boy",
  breed: "Labrador",
  cover: "/api/file/banner-1",
};

beforeEach(() => {
  mockObjectURLs();
  mockImageSize(1200, 800);
  mockViewportSize(400, 400);
  vi.mocked(updatePetAction).mockResolvedValue({ ok: true });
});

function fileInputs() {
  return Array.from(document.querySelectorAll('input[type="file"]')) as HTMLInputElement[];
}

describe("EditProfileModal", () => {
  it("renders within the viewport with banner section and sticky save footer", () => {
    render(<EditProfileModal pet={pet} onClose={() => {}} />);
    expect(screen.getByText("Profile banner")).toBeInTheDocument();
    expect(screen.getByAltText("Profile banner")).toHaveAttribute("src", "/api/file/banner-1");
    expect(screen.getByDisplayValue("Bruno")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Good boy")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Save changes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("removes the banner and submits removeCover", async () => {
    render(<EditProfileModal pet={pet} onClose={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(screen.queryByAltText("Profile banner")).toBeNull();
    expect(screen.getByText(/No banner yet/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(updatePetAction).toHaveBeenCalledTimes(1));
    const fd = vi.mocked(updatePetAction).mock.calls[0][1] as FormData;
    expect(fd.get("removeCover")).toBe("true");
    expect(fd.get("cover")).toBeNull();
    // Existing profile data is preserved, not blanked.
    expect(fd.get("bio")).toBe("Good boy");
    expect(fd.get("breed")).toBe("Labrador");
  });

  it("adjusts a new banner through the editor before saving", async () => {
    mockCanvas();
    render(<EditProfileModal pet={{ ...pet, cover: null }} onClose={() => {}} />);
    expect(screen.getByText(/No banner yet/)).toBeInTheDocument();

    const [, coverInput] = fileInputs();
    const file = new File(["banner-bytes"], "banner.png", { type: "image/png" });
    fireEvent.change(coverInput, { target: { files: [file] } });

    // Editor opens for framing before anything is saved.
    expect(await screen.findByText("Adjust banner")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Use photo" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));

    await waitFor(() => expect(screen.getByAltText("Profile banner")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(updatePetAction).toHaveBeenCalledTimes(1));
    const fd = vi.mocked(updatePetAction).mock.calls[0][1] as FormData;
    const cover = fd.get("cover");
    expect(cover).toBeInstanceOf(File);
    expect((cover as File).type).toBe("image/jpeg");
    expect(fd.get("removeCover")).toBeNull();
  });

  it("adjusts the profile photo through the editor with a circular preview", async () => {
    mockCanvas();
    render(<EditProfileModal pet={pet} onClose={() => {}} />);
    const [avatarInput] = fileInputs();
    fireEvent.change(avatarInput, { target: { files: [new File(["pic"], "pic.png", { type: "image/png" })] } });

    expect(await screen.findByText("Adjust profile photo")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Use photo" })).toBeEnabled());
    expect(document.querySelector(".border-dashed")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Use photo" }));
    await waitFor(() => expect(screen.queryByText("Adjust profile photo")).toBeNull());

    fireEvent.click(screen.getByRole("button", { name: /Save changes/ }));
    await waitFor(() => expect(updatePetAction).toHaveBeenCalledTimes(1));
    const fd = vi.mocked(updatePetAction).mock.calls[0][1] as FormData;
    expect(fd.get("avatar")).toBeInstanceOf(File);
  });
});
