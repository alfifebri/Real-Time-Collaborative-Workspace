"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { EditorUser, WorkspaceContext } from "@/lib/types";
import { canEditRole } from "@/lib/roles";
import { WORKSPACE_ICONS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { Modal } from "@/components/ui/modal";
import { Sidebar } from "./sidebar";
import { CommandPalette } from "./command-palette";
import { WorkspaceUIProvider } from "./workspace-ui";

type WorkspaceShellProps = {
  user: EditorUser;
  context: WorkspaceContext;
  children: React.ReactNode;
};

export function WorkspaceShell({ user, context, children }: WorkspaceShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [createWorkspaceOpen, setCreateWorkspaceOpen] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("cowork:sidebar-collapsed");
    if (stored === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("cowork:sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setCreateWorkspaceOpen(true);
      }
      if (
        (event.metaKey || event.ctrlKey) &&
        !event.shiftKey &&
        !event.altKey &&
        event.key.toLowerCase() === "b"
      ) {
        const target = event.target;
        const typing =
          target instanceof HTMLElement &&
          (target.isContentEditable ||
            Boolean(target.closest("input, textarea, select, [contenteditable='true']")));
        if (typing) return;
        event.preventDefault();
        setCollapsed((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  return (
    <WorkspaceUIProvider
      value={{
        openMobileSidebar: () => setMobileOpen(true),
        openCommandPalette: () => setPaletteOpen(true),
      }}
    >
      <div className="flex min-h-dvh bg-canvas">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 76 : 276 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="sticky top-0 z-40 hidden h-dvh shrink-0 border-r border-line bg-canvas-soft lg:block"
        >
          <div className="h-full w-full">
            <Sidebar
              user={user}
              context={context}
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((value) => !value)}
              onCreateWorkspace={() => setCreateWorkspaceOpen(true)}
            />
          </div>
        </motion.aside>

        <AnimatePresence>
          {mobileOpen && (
            <div className="fixed inset-0 z-[80] lg:hidden">
              <motion.button
                type="button"
                aria-label="Close sidebar"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeMobile}
                className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
              />
              <motion.aside
                initial={{ x: -300 }}
                animate={{ x: 0 }}
                exit={{ x: -300 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="relative h-full w-[286px] border-r border-line bg-canvas-soft shadow-panel"
              >
                <button
                  type="button"
                  onClick={closeMobile}
                  className="absolute right-3 top-3 z-10 rounded-md bg-surface p-1.5 text-ink-faint transition-colors hover:text-ink"
                  aria-label="Close sidebar"
                >
                  <X size={14} />
                </button>
                <Sidebar
                  user={user}
                  context={context}
                  collapsed={false}
                  onToggleCollapsed={() => setCollapsed((value) => !value)}
                  onCreateWorkspace={() => {
                    closeMobile();
                    setCreateWorkspaceOpen(true);
                  }}
                  onMobileClose={closeMobile}
                />
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main className="min-w-0 flex-1">{children}</main>
      </div>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        documents={context.documents}
        workspaceSlug={context.workspace.slug}
        workspaceId={context.workspace.id}
        canEdit={canEditRole(context.role)}
      />

      <CreateWorkspaceModal
        open={createWorkspaceOpen}
        onClose={() => setCreateWorkspaceOpen(false)}
        onCreated={(slug) => {
          setCreateWorkspaceOpen(false);
          router.push(`/w/${slug}`);
          router.refresh();
        }}
      />
    </WorkspaceUIProvider>
  );
}

function CreateWorkspaceModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (slug: string) => void;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string>(WORKSPACE_ICONS[0]);
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), icon }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not create workspace");
      toast.success("Workspace created");
      setName("");
      onCreated(payload.workspace.slug);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create workspace");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a workspace"
      description="A shared home for a team, a project, or a very good idea."
    >
      <form onSubmit={submit} className="space-y-4 px-5 py-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium text-ink-muted">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="field"
            placeholder="Product Studio"
            autoFocus
            maxLength={60}
            required
          />
        </label>

        <div>
          <span className="mb-2 block text-[11px] font-medium text-ink-muted">Icon</span>
          <div className="flex flex-wrap gap-1.5">
            {WORKSPACE_ICONS.map((symbol) => (
              <button
                key={symbol}
                type="button"
                onClick={() => setIcon(symbol)}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                  icon === symbol
                    ? "border-neon-emerald/30 bg-neon-emerald/[0.07] text-neon-emerald"
                    : "border-line bg-tint-2 text-ink-muted hover:border-line-bright hover:text-ink",
                )}
                aria-label={symbol}
              >
                <IconGlyph name={symbol} size={15} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button-primary" disabled={loading || !name.trim()}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Create workspace"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
