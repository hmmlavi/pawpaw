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

import { PetAvatar, OwnerAvatar } from "@/components/ui";

describe("PetAvatar", () => {
  it("resolves a bare file id to the file URL", () => {
    render(<PetAvatar avatarFileId="abc-123" name="Bruno" icon="dog" />);
    expect(screen.getByRole("img", { name: "Bruno" })).toHaveAttribute("src", "/api/file/abc-123");
  });

  it("accepts a full file URL as-is", () => {
    render(<PetAvatar avatarFileId="/api/file/abc-123" name="Bruno" icon="dog" />);
    expect(screen.getByRole("img", { name: "Bruno" })).toHaveAttribute("src", "/api/file/abc-123");
  });

  it("shows the default avatar design when no photo exists", () => {
    const { container } = render(<PetAvatar avatarFileId={null} name="Bruno" icon="dog" />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });

  it("falls back to the default design when the image fails to load", () => {
    const { container } = render(<PetAvatar avatarFileId="broken-id" name="Bruno" icon="dog" />);
    fireEvent.error(screen.getByRole("img", { name: "Bruno" }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

describe("OwnerAvatar", () => {
  it("renders initials from the personal account name", () => {
    render(<OwnerAvatar name="Rahul Sharma" />);
    expect(screen.getByText("RS")).toBeInTheDocument();
  });

  it("handles single names", () => {
    render(<OwnerAvatar name="Rahul" />);
    expect(screen.getByText("R")).toBeInTheDocument();
  });
});
