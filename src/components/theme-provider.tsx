"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "pawkind-theme";

function readStored(): ThemeChoice {
  if (typeof window === "undefined") return "system";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function systemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function resolveTheme(choice: ThemeChoice): ResolvedTheme {
  return choice === "system" ? systemTheme() : choice;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", resolved === "dark" ? "#0b0c0e" : "#f1efe9");
}

const ThemeContext = createContext<{
  theme: ThemeChoice;
  resolved: ResolvedTheme;
  setTheme: (t: ThemeChoice) => void;
}>({ theme: "system", resolved: "dark", setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>(() => readStored());
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (typeof window === "undefined") return "dark";
    // The pre-paint script in <head> already set data-theme; honor it to avoid flashes.
    const pre = document.documentElement.dataset.theme;
    if (pre === "light" || pre === "dark") return pre;
    return resolveTheme(readStored());
  });

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const apply = () => {
      const r = resolveTheme(theme);
      setResolved(r);
      applyTheme(r);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
      document.cookie = `${STORAGE_KEY}=${t}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* storage unavailable — theme still applies for this session */
    }
    setThemeState(t);
  }, []);

  return <ThemeContext.Provider value={{ theme, resolved, setTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
