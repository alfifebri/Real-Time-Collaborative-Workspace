"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme, type Theme } from "./theme-provider";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function ThemeSwitcher({
  variant = "menu",
  className,
}: {
  variant?: "menu" | "compact";
  className?: string;
}) {
  const { theme, setTheme } = useTheme();
  const compact = variant === "compact";

  return (
    <div
      role="group"
      aria-label="Theme"
      className={cn(
        "flex items-center gap-0.5 rounded-lg border border-line bg-tint-2 p-0.5",
        className,
      )}
    >
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={active}
            title={`${option.label} theme`}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-all duration-150",
              compact ? "h-7 w-7" : "h-7 flex-1 px-2 text-[10.5px]",
              active
                ? "bg-surface-raised text-ink shadow-soft-inset"
                : "text-ink-faint hover:bg-tint-3 hover:text-ink-muted",
            )}
          >
            <Icon size={compact ? 13 : 12} strokeWidth={1.75} />
            {!compact && <span>{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
