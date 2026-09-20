// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@/actions/content", () => ({
  getCommentsAction: vi.fn(),
  addCommentAction: vi.fn(),
  deleteCommentAction: vi.fn(),
  toggleCommentLikeAction: vi.fn(),
  toggleLikeAction: vi.fn(),
  toggleSaveAction: vi.fn(),
  toggleRepostAction: vi.fn(),
  deletePostAction: vi.fn(),
  updatePostCaptionAction: vi.fn(),
  followAction: vi.fn(),
  toggleBlockAction: vi.fn(),
  reportAction: vi.fn(),
}));
vi.mock("@/actions/messages", () => ({
  openConversationAction: vi.fn(),
  sendMessageAction: vi.fn(),
}));
vi.mock("@/actions/pets", () => ({ searchPetsAction: vi.fn(async () => []) }));
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
  usePathname: () => "/home",
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

import { CommentsPanel } from "@/components/feed";
import {
  getCommentsAction,
  addCommentAction,
  toggleCommentLikeAction,
} from "@/actions/content";
import type { PetLite } from "@/lib/queries";

const bruno: PetLite = {
  id: "pet-bruno", name: "Bruno", username: "bruno", icon: "dog", avatar: null,
  animalType: "dog", city: "Lisbon", isPrivate: false, starBadge: false, birthday: null,
};
const mittens: PetLite = {
  id: "pet-mittens", name: "Mittens", username: "mittens", icon: "cat", avatar: null,
  animalType: "cat", city: "Lisbon", isPrivate: false, starBadge: false, birthday: null,
};

const commentRow = {
  id: "c1",
  text: "This is adorable!",
  parentId: null,
  createdAt: new Date().toISOString(),
  likeCount: 2,
  viewerLiked: false,
  ownerName: "Priya",
  author: mittens,
};

beforeEach(() => {
  vi.mocked(getCommentsAction).mockResolvedValue([commentRow]);
  vi.mocked(addCommentAction).mockResolvedValue({ ok: true });
  vi.mocked(toggleCommentLikeAction).mockResolvedValue({ liked: true, likeCount: 3 });
});

describe("CommentsPanel identity + likes", () => {
  it("shows the personal account name, not the pet name", async () => {
    render(<CommentsPanel postId="p1" me={bruno} meOwner="Rahul" onCountChange={() => {}} />);
    expect(await screen.findByText("Priya")).toBeInTheDocument();
    expect(screen.getByText("This is adorable!")).toBeInTheDocument();
    // Pet name must not appear as visible identity.
    expect(screen.queryByText("Mittens")).toBeNull();
    expect(screen.getByPlaceholderText("Comment as Rahul…")).toBeInTheDocument();
  });

  it("likes/unlikes a comment with live count and pressed state", async () => {
    render(<CommentsPanel postId="p1" me={bruno} meOwner="Rahul" onCountChange={() => {}} />);
    const likeBtn = await screen.findByRole("button", { name: "Like comment" });
    expect(likeBtn).toHaveTextContent("2");
    expect(likeBtn).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(likeBtn);
    expect(toggleCommentLikeAction).toHaveBeenCalledWith("c1");
    const likedBtn = await screen.findByRole("button", { name: "Unlike comment" });
    expect(likedBtn).toHaveAttribute("aria-pressed", "true");
    expect(likedBtn).toHaveTextContent("3");
  });

  it("submits a comment attributed to the owner", async () => {
    const onCountChange = vi.fn();
    render(<CommentsPanel postId="p1" me={bruno} meOwner="Rahul" onCountChange={onCountChange} />);
    await screen.findByText("Priya");

    fireEvent.change(screen.getByPlaceholderText("Comment as Rahul…"), { target: { value: "So cute" } });
    fireEvent.click(screen.getByRole("button", { name: "Send comment" }));

    expect(addCommentAction).toHaveBeenCalledWith("p1", "So cute", undefined);
    expect(await screen.findByText("So cute")).toBeInTheDocument();
    expect(onCountChange).toHaveBeenCalledWith(2);
  });
});
