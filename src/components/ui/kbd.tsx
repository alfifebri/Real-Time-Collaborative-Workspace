import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-tint-3 px-1.5 font-mono text-[9px] font-medium text-ink-faint",
        className,
      )}
    >
      {children}
    </kbd>
  );
}
