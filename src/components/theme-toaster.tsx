"use client";

import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

export function ThemeToaster() {
  const { resolved } = useTheme();
  const dark = resolved !== "light";
  return (
    <Toaster
      theme={dark ? "dark" : "light"}
      position="top-center"
      toastOptions={{
        style: dark
          ? {
              background: "rgba(18,20,24,0.9)",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(16px)",
              color: "#e9eae6",
              borderRadius: "14px",
            }
          : {
              background: "rgba(255,255,255,0.92)",
              border: "1px solid rgba(32,38,45,0.1)",
              backdropFilter: "blur(16px)",
              color: "#22282e",
              borderRadius: "14px",
            },
      }}
    />
  );
}
