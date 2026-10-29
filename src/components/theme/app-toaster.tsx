"use client";

import { Toaster } from "sonner";
import { useTheme } from "./theme-provider";

export function AppToaster() {
  const { resolvedTheme } = useTheme();

  return (
    <Toaster
      theme={resolvedTheme}
      position="bottom-right"
      toastOptions={{
        style: {
          background: "rgb(var(--surface))",
          border: "1px solid rgb(var(--line))",
          color: "rgb(var(--ink))",
          borderRadius: "12px",
          fontFamily: "var(--font-geist)",
          boxShadow: "0 18px 48px -28px rgb(var(--shadow-base) / 0.65)",
        },
      }}
    />
  );
}
