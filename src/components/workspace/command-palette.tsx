"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CornerDownLeft, FileText, Home, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import type { DocumentSummary } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { Kbd } from "@/components/ui/kbd";

type CommandPaletteProps = {
  open: boolean;
  onClose: () => void;
  documents: DocumentSummary[];
  workspaceSlug: string;
  workspaceId: string;
  canEdit: boolean;
};

type PaletteItem =
  | { kind: "doc"; id: string; title: string; icon: string; href: string; hint: string }
  | { kind: "action"; id: string; title: string; icon: React.ReactNode; action: () => void; hint: string };

export function CommandPalette({
  open,
  onClose,
  documents,
  workspaceSlug,
  workspaceId,
  canEdit,
}: CommandPaletteProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(timer);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const createPage = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not create page");
      onClose();
      router.push(`/w/${workspaceSlug}/d/${payload.document.id}`);
      router.refresh();
      toast.success("Page created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create page");
    } finally {
      setCreating(false);
    }
  };

  const items = useMemo<PaletteItem[]>(() => {
    const needle = query.toLowerCase().trim();
    const docs = documents
      .filter((document) => !needle || document.title.toLowerCase().includes(needle))
      .sort((a, b) => {
        if (needle) {
          const aStarts = a.title.toLowerCase().startsWith(needle) ? 0 : 1;
          const bStarts = b.title.toLowerCase().startsWith(needle) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
        }
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      })
      .slice(0, 7)
      .map<PaletteItem>((document) => ({
        kind: "doc",
        id: document.id,
        title: document.title,
        icon: document.icon,
        href: `/w/${workspaceSlug}/d/${document.id}`,
        hint: document.isFavorite ? "Favorite" : "Page",
      }));

    const actions: PaletteItem[] = [
      ...(canEdit
        ? [
            {
              kind: "action" as const,
              id: "new-page",
              title: "Create a new page",
              icon: <Plus size={14} />,
              action: createPage,
              hint: "Action",
            },
          ]
        : []),
      {
        kind: "action",
        id: "home",
        title: "Go to workspace home",
        icon: <Home size={14} />,
        action: () => {
          onClose();
          router.push(`/w/${workspaceSlug}`);
        },
        hint: "Action",
      },
    ];

    return [...docs, ...actions];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documents, query, workspaceSlug, canEdit, router, onClose, creating]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((current) => Math.min(current + 1, items.length - 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = items[active];
        if (!item) return;
        if (item.kind === "doc") {
          onClose();
          router.push(item.href);
        } else {
          item.action();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, active, onClose, router]);

  useEffect(() => {
    const selected = listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    selected?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex justify-center px-4 pt-[12vh]">
          <motion.button
            type="button"
            aria-label="Close search"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-black/65 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.99 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 h-fit w-full max-w-[580px] overflow-hidden rounded-2xl border border-line-bright bg-surface/95 shadow-panel backdrop-blur-xl"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
              <Search size={16} className="text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search pages, jump to a doc, or run an action…"
                className="flex-1 bg-transparent text-[13px] text-ink outline-none placeholder:text-ink-faint"
              />
              <Kbd>ESC</Kbd>
            </div>

            <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
              {items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                  <Search size={20} className="text-ink-faint" />
                  <p className="text-sm font-medium text-ink">No results found</p>
                  <p className="text-xs text-ink-faint">
                    Try a different title, or create a new page.
                  </p>
                </div>
              ) : (
                <>
                  <p className="px-2 pb-1.5 pt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    {query ? "Results" : "Recent pages"}
                  </p>
                  {items.map((item, index) => (
                    <button
                      type="button"
                      key={`${item.kind}-${item.id}`}
                      data-index={index}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => {
                        if (item.kind === "doc") {
                          onClose();
                          router.push(item.href);
                        } else {
                          item.action();
                        }
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                        active === index ? "bg-tint-4" : "hover:bg-tint-3",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
                          active === index
                            ? "border-neon-emerald/20 bg-neon-emerald/[0.06] text-neon-emerald"
                            : "border-line bg-tint-2 text-ink-muted",
                        )}
                      >
                        {item.kind === "doc" ? (
                          <IconGlyph name={item.icon} size={13} />
                        ) : (
                          item.icon
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12.5px] font-medium text-ink">
                          {item.title}
                        </span>
                        <span className="block text-[9.5px] text-ink-faint">{item.hint}</span>
                      </span>
                      {item.kind === "action" && creating && item.id === "new-page" ? (
                        <Loader2 size={13} className="animate-spin text-ink-faint" />
                      ) : active === index ? (
                        <CornerDownLeft size={12} className="text-ink-faint" />
                      ) : (
                        <FileText size={12} className="opacity-0" />
                      )}
                    </button>
                  ))}
                </>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-line bg-tint-1 px-4 py-2.5 text-[9.5px] text-ink-faint">
              <span className="flex items-center gap-2">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> navigate
              </span>
              <span className="flex items-center gap-2">
                <Kbd>↵</Kbd> open
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
