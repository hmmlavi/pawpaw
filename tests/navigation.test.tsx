// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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
vi.mock("@/actions/auth", () => ({ switchPetAction: vi.fn(), logoutAction: vi.fn() }));

import { AppShell, CreateFab, type ShellPet } from "@/components/app-shell";

const activePet: ShellPet = { id: "p1", name: "Bruno", username: "bruno", icon: "dog", avatar: null };

describe("CreateFab", () => {
  it("opens a compact Post/Story/Reel menu and picks a kind", () => {
    const onPick = vi.fn();
    render(<CreateFab onPick={onPick} />);

    expect(screen.queryByRole("menu")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Create post, story or reel" }));

    const menu = screen.getByRole("menu");
    expect(menu).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Create Post/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Add Story/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Create Reel/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("menuitem", { name: /Add Story/ }));
    expect(onPick).toHaveBeenCalledWith("story");
    expect(screen.queryByRole("menu")).toBeNull();
  });

  it("closes on Escape", () => {
    render(<CreateFab onPick={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Create post, story or reel" }));
    expect(screen.getByRole("menu")).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
  });
});

describe("AppShell dock", () => {
  it("shows Home → Explore → AI → Chat → Profile with no create tab", () => {
    render(
      <AppShell activePet={activePet} pets={[activePet]} unread={0} openComposer={() => {}}>
        <div>page</div>
      </AppShell>,
    );
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const labels = ["Home", "Explore", "AI", "Chat", "Profile"];
    for (const label of labels) {
      expect(nav.textContent).toContain(label);
    }
    expect(screen.queryByRole("link", { name: "Create" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create" })).toBeNull();
    // Home is the active tab on /home.
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  });
});
