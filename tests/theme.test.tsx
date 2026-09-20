// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ThemeProvider, useTheme } from "@/components/theme-provider";
import { mockMatchMedia } from "./support/jsdom";

function Probe() {
  const { theme, resolved, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolved}</span>
      <button onClick={() => setTheme("system")}>system</button>
      <button onClick={() => setTheme("light")}>light</button>
      <button onClick={() => setTheme("dark")}>dark</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.classList.remove("dark");
});

describe("ThemeProvider", () => {
  it("defaults to system and follows a dark device", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("system");
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows a light device in system mode", () => {
    mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("persists explicit light/dark choices and applies them", () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "light" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("pawkind-theme")).toBe("light");

    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("pawkind-theme")).toBe("dark");
  });

  it("restores the saved choice on reload", () => {
    mockMatchMedia(false);
    localStorage.setItem("pawkind-theme", "light");
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("reacts to OS appearance changes while in system mode", () => {
    const mm = mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    act(() => mm.setLight(true));
    expect(screen.getByTestId("resolved")).toHaveTextContent("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("ignores OS changes once the user pins a theme", () => {
    const mm = mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    act(() => mm.setLight(true));
    expect(screen.getByTestId("resolved")).toHaveTextContent("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
