"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  FilePlus2,
  Home,
  LogOut,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  Pin,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type { DocumentSummary, WorkspaceContext } from "@/lib/types";
import type { EditorUser } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { roleLabels, canEditRole } from "@/lib/roles";
import { useClickOutside } from "@/hooks/use-click-outside";
import { ConfirmDialog } from "@/components/ui/modal";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { Kbd } from "@/components/ui/kbd";
import { ThemeSwitcher } from "@/components/theme/theme-switcher";
import { useWorkspaceUI } from "./workspace-ui";

type SidebarProps = {
  user: EditorUser;
  context: WorkspaceContext;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCreateWorkspace: () => void;
  onNavigate?: () => void;
  onMobileClose?: () => void;
};

type TreeNode = DocumentSummary & { children: TreeNode[] };

function buildTree(documents: DocumentSummary[]): TreeNode[] {
  const map = new Map<string, TreeNode>();
  for (const document of documents) {
    map.set(document.id, { ...document, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    nodes.forEach((node) => sort(node.children));
  };
  sort(roots);
  return roots;
}

export function Sidebar({
  user,
  context,
  collapsed,
  onToggleCollapsed,
  onCreateWorkspace,
  onNavigate,
  onMobileClose,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { openCommandPalette } = useWorkspaceUI();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useClickOutside(workspaceMenuRef, () => setWorkspaceMenuOpen(false), workspaceMenuOpen);
  useClickOutside(userMenuRef, () => setUserMenuOpen(false), userMenuOpen);

  const tree = useMemo(() => buildTree(context.documents), [context.documents]);
  const favorites = useMemo(
    () => context.documents.filter((document) => document.isFavorite).slice(0, 6),
    [context.documents],
  );

  useEffect(() => {
    const next = new Set(expanded);
    for (const document of context.documents) {
      if (document.parentId) next.add(document.parentId);
    }
    if (pathname) {
      const activeId = pathname.split("/d/")[1]?.split("/")[0];
      if (activeId) {
        let cursor = context.documents.find((document) => document.id === activeId);
        while (cursor?.parentId) {
          next.add(cursor.parentId);
          cursor = context.documents.find((document) => document.id === cursor?.parentId);
        }
      }
    }
    setExpanded(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, context.documents.length]);

  const toggleExpanded = (id: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const go = (href: string) => {
    router.push(href);
    onNavigate?.();
    onMobileClose?.();
  };

  const createPage = async (parentId?: string) => {
    if (!canEditRole(context.role) || creating) return;
    setCreating(true);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: context.workspace.id, parentId: parentId ?? null }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not create page");
      router.refresh();
      go(`/w/${context.workspace.slug}/d/${payload.document.id}`);
      toast.success("Page created");
      if (parentId) toggleExpanded(parentId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create page");
    } finally {
      setCreating(false);
    }
  };

  const toggleFavorite = async (document: DocumentSummary) => {
    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isFavorite: !document.isFavorite }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not update favorite");
      }
      router.refresh();
      toast.success(document.isFavorite ? "Removed from favorites" : "Added to favorites");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update favorite");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const response = await fetch(`/api/documents/${deleteTarget.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not delete page");
      }
      toast.success("Page deleted");
      if (pathname.includes(`/d/${deleteTarget.id}`)) {
        go(`/w/${context.workspace.slug}`);
      }
      setDeleteTarget(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete page");
    } finally {
      setDeleting(false);
    }
  };

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Could not sign out");
      setUserMenuOpen(false);
      router.refresh();
      window.location.assign("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not sign out");
      setSigningOut(false);
    }
  };

  const activeDocumentId = pathname.split("/d/")[1]?.split("/")[0] ?? null;

  return (
    <>
      <div className="relative flex h-full flex-col bg-canvas-soft">
        <div
          className={cn(
            "flex h-14 shrink-0 items-center border-b border-line",
            collapsed ? "gap-0.5 px-1.5" : "gap-1 px-2.5 pr-10 lg:pr-2.5",
          )}
        >
          <div ref={workspaceMenuRef} className="relative min-w-0 flex-1">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((open) => !open)}
              title={collapsed ? context.workspace.name : undefined}
              className={cn(
                "group flex w-full items-center gap-2.5 rounded-lg text-left transition-colors hover:bg-tint-3",
                collapsed ? "h-8 justify-center px-0" : "px-1.5 py-1.5",
              )}
            >
              <span
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-lg border border-line shadow-soft-inset",
                  collapsed ? "h-6 w-6" : "h-7 w-7",
                )}
                style={{
                  background: `linear-gradient(145deg, ${context.workspace.accent}18, transparent 75%)`,
                  color: context.workspace.accent,
                }}
              >
                <IconGlyph name={context.workspace.icon} size={collapsed ? 12 : 13} />
                <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full border border-canvas-soft bg-neon-emerald" />
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] font-semibold tracking-[-0.01em] text-ink">
                      {context.workspace.name}
                    </span>
                    <span className="block text-[9.5px] text-ink-faint">
                      {context.members.length} members · {roleLabels[context.role]}
                    </span>
                  </span>
                  <ChevronDown
                    size={13}
                    strokeWidth={1.75}
                    className={cn(
                      "shrink-0 text-ink-faint transition-transform",
                      workspaceMenuOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>

            <AnimatePresence>
              {workspaceMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -3, scale: 0.985 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  className={cn(
                    "absolute z-50 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-panel",
                    collapsed ? "left-0 w-60" : "left-0 w-full min-w-[248px]",
                  )}
                >
                  <p className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                    Your workspaces
                  </p>
                  {context.workspaces.map((workspace) => (
                    <Link
                      key={workspace.id}
                      href={`/w/${workspace.slug}`}
                      onClick={() => setWorkspaceMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-tint-4",
                        workspace.id === context.workspace.id && "bg-tint-3",
                      )}
                    >
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-md border border-line"
                        style={{ color: workspace.accent }}
                      >
                        <IconGlyph name={workspace.icon} size={11} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">
                        {workspace.name}
                      </span>
                      <span className="text-[9px] text-ink-faint">{roleLabels[workspace.role]}</span>
                    </Link>
                  ))}
                  <div className="my-1 h-px bg-line" />
                  <button
                    type="button"
                    onClick={() => {
                      setWorkspaceMenuOpen(false);
                      onCreateWorkspace();
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-md border border-dashed border-line-bright">
                      <Plus size={12} strokeWidth={1.75} />
                    </span>
                    New workspace
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={onToggleCollapsed}
            className={cn(
              "hidden shrink-0 items-center justify-center rounded-md text-ink-faint transition-colors hover:bg-tint-4 hover:text-ink lg:inline-flex",
              collapsed ? "h-7 w-7" : "h-8 w-8",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={`${collapsed ? "Expand" : "Collapse"} sidebar (Ctrl+B)`}
          >
            {collapsed ? (
              <PanelLeftOpen size={15} strokeWidth={1.75} />
            ) : (
              <PanelLeftClose size={15} strokeWidth={1.75} />
            )}
          </button>
        </div>

        <div className={cn("space-y-1 px-2.5 pt-3", collapsed && "px-2")}>
          <button
            type="button"
            onClick={() => {
              onNavigate?.();
              openCommandPalette();
            }}
            className={cn(
              "group flex w-full items-center gap-2.5 rounded-lg border border-line bg-tint-2 px-2.5 py-2 text-left text-xs text-ink-faint transition-all hover:border-line-bright hover:bg-tint-3 hover:text-ink-muted",
              collapsed && "justify-center border-transparent bg-transparent px-0",
            )}
            title="Search"
          >
            <Search size={14} strokeWidth={1.75} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">Search or jump to…</span>
                <Kbd>⌘K</Kbd>
              </>
            )}
          </button>

          <Link
            href={`/w/${context.workspace.slug}`}
            onClick={() => {
              onNavigate?.();
              onMobileClose?.();
            }}
            className={cn(
              "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors",
              pathname === `/w/${context.workspace.slug}`
                ? "bg-tint-4 text-ink"
                : "text-ink-muted hover:bg-tint-3 hover:text-ink",
              collapsed && "justify-center px-0",
            )}
            title="Workspace home"
          >
            {pathname === `/w/${context.workspace.slug}` && (
              <span className="absolute left-0 top-1/2 h-3.5 w-0.5 -translate-y-1/2 rounded-full bg-neon-emerald" />
            )}
            <Home size={14} strokeWidth={1.75} />
            {!collapsed && <span>Home</span>}
          </Link>
        </div>

        <div className="mt-5 flex min-h-0 flex-1 flex-col overflow-y-auto px-2.5 pb-4 scrollbar-none">
          {!collapsed && favorites.length > 0 && (
            <div className="mb-5">
              <div className="mb-1 flex items-center justify-between px-2">
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Favorites
                </span>
                <Pin size={10} strokeWidth={1.75} className="text-ink-faint" />
              </div>
              <div className="space-y-0.5">
                {favorites.map((document) => (
                  <Link
                    key={document.id}
                    href={`/w/${context.workspace.slug}/d/${document.id}`}
                    onClick={() => {
                      onNavigate?.();
                      onMobileClose?.();
                    }}
                    className={cn(
                      "relative flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors",
                      activeDocumentId === document.id
                        ? "bg-tint-4 text-ink"
                        : "text-ink-muted hover:bg-tint-3 hover:text-ink",
                    )}
                  >
                    {activeDocumentId === document.id && (
                      <span className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-neon-emerald" />
                    )}
                    <IconGlyph name={document.icon} size={12} className="shrink-0 text-ink-faint" />
                    <span className="truncate">{document.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div>
            <div className="mb-1 flex items-center justify-between px-2">
              {!collapsed && (
                <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                  Pages
                </span>
              )}
              {canEditRole(context.role) && (
                <button
                  type="button"
                  onClick={() => createPage()}
                  disabled={creating}
                  className="rounded p-0.5 text-ink-faint transition-colors hover:text-ink"
                  title="New page"
                >
                  <Plus size={13} strokeWidth={1.75} />
                </button>
              )}
            </div>

            <div className="space-y-0.5">
              {collapsed
                ? tree.map((node) => (
                    <Link
                      key={node.id}
                      href={`/w/${context.workspace.slug}/d/${node.id}`}
                      onClick={() => {
                        onNavigate?.();
                        onMobileClose?.();
                      }}
                      title={node.title}
                      className={cn(
                        "flex h-8 items-center justify-center rounded-md transition-colors hover:bg-tint-4",
                        activeDocumentId === node.id && "bg-tint-4 text-ink",
                      )}
                    >
                      <IconGlyph name={node.icon} size={13} />
                    </Link>
                  ))
                : tree.map((node) => (
                    <TreeItem
                      key={node.id}
                      node={node}
                      depth={0}
                      slug={context.workspace.slug}
                      expanded={expanded}
                      activeId={activeDocumentId}
                      canEdit={canEditRole(context.role)}
                      onToggle={toggleExpanded}
                      onNavigate={() => {
                        onNavigate?.();
                        onMobileClose?.();
                      }}
                      onCreateChild={createPage}
                      onToggleFavorite={toggleFavorite}
                      onDelete={setDeleteTarget}
                    />
                  ))}

              {!collapsed && tree.length === 0 && (
                <button
                  type="button"
                  onClick={() => createPage()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line px-3 py-6 text-center transition-colors hover:border-line-bright hover:bg-tint-2"
                >
                  <FilePlus2 size={16} strokeWidth={1.5} className="text-ink-faint" />
                  <span className="text-[11px] text-ink-muted">Create your first page</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={cn("border-t border-line", collapsed ? "p-1.5" : "p-2.5")}>
          <div ref={userMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setUserMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              title={collapsed ? user.name : undefined}
              className={cn(
                "flex w-full items-center rounded-lg text-left transition-colors hover:bg-tint-4",
                collapsed ? "h-9 justify-center px-0" : "gap-2.5 px-2 py-1.5",
                userMenuOpen && "bg-tint-4",
              )}
            >
              <span
                className={cn(
                  "relative flex shrink-0 items-center justify-center rounded-full font-bold text-[#0b0d10]",
                  collapsed ? "h-7 w-7 text-[9px]" : "h-7 w-7 text-[9px]",
                )}
                style={{ backgroundColor: user.color }}
              >
                {initials(user.name)}
                <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-2 border-canvas-soft bg-neon-emerald" />
              </span>
              {!collapsed && (
                <>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11.5px] font-semibold text-ink">
                      {user.name}
                    </span>
                    <span className="flex items-center gap-1.5 text-[9px] text-ink-faint">
                      <span className="live-dot scale-75" />
                      Online · {roleLabels[context.role]}
                    </span>
                  </span>
                  <ChevronsUpDown
                    size={13}
                    strokeWidth={1.75}
                    className={cn(
                      "shrink-0 text-ink-faint transition-transform",
                      userMenuOpen && "rotate-180",
                    )}
                  />
                </>
              )}
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 4, scale: 0.985 }}
                  transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                  role="menu"
                  className={cn(
                    "absolute bottom-full z-50 mb-2 overflow-hidden rounded-xl border border-line bg-surface/95 shadow-panel backdrop-blur-xl",
                    collapsed ? "left-0 w-64" : "left-0 right-0 min-w-[248px]",
                  )}
                >
                  <div className="flex items-center gap-2.5 border-b border-line px-3 py-3">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0b0d10]"
                      style={{ backgroundColor: user.color }}
                    >
                      {initials(user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-ink">{user.name}</p>
                      <p className="truncate text-[10px] text-ink-faint">
                        {user.title ?? "Member"} · {roleLabels[context.role]}
                      </p>
                    </div>
                  </div>

                  <div className="px-2.5 py-2.5">
                    <p className="mb-1.5 px-0.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
                      Appearance
                    </p>
                    <ThemeSwitcher />
                  </div>

                  <div className="border-t border-line p-1.5">
                    <button
                      type="button"
                      onClick={signOut}
                      disabled={signingOut}
                      role="menuitem"
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-neon-coral/[0.08] hover:text-neon-coral disabled:opacity-60"
                    >
                      {signingOut ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <LogOut size={13} strokeWidth={1.75} />
                      )}
                      {signingOut ? "Signing out…" : "Sign out"}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this page?"
        description={`“${deleteTarget?.title ?? "Untitled"}” and all of its nested pages, comments and versions will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete page"
        destructive
        loading={deleting}
      />
    </>
  );
}

type TreeItemProps = {
  node: TreeNode;
  depth: number;
  slug: string;
  expanded: Set<string>;
  activeId: string | null;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onNavigate: () => void;
  onCreateChild: (parentId: string) => void;
  onToggleFavorite: (document: DocumentSummary) => void;
  onDelete: (document: DocumentSummary) => void;
};

function TreeItem({
  node,
  depth,
  slug,
  expanded,
  activeId,
  canEdit,
  onToggle,
  onNavigate,
  onCreateChild,
  onToggleFavorite,
  onDelete,
}: TreeItemProps) {
  const isOpen = expanded.has(node.id);
  const isActive = activeId === node.id;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className={cn(
          "group relative flex items-center rounded-md pr-1 transition-colors",
          isActive ? "bg-tint-4" : "hover:bg-tint-3",
        )}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        {isActive && (
          <span className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-neon-emerald" />
        )}
        <button
          type="button"
          onClick={() => hasChildren && onToggle(node.id)}
          className={cn(
            "flex h-5 w-4 shrink-0 items-center justify-center rounded text-ink-faint transition-colors hover:text-ink",
            !hasChildren && "pointer-events-none opacity-0",
          )}
          aria-label={isOpen ? "Collapse" : "Expand"}
        >
          <ChevronRight
            size={11}
            strokeWidth={1.75}
            className={cn("transition-transform duration-150", isOpen && "rotate-90")}
          />
        </button>

        <Link
          href={`/w/${slug}/d/${node.id}`}
          onClick={onNavigate}
          className="flex min-w-0 flex-1 items-center gap-1.5 py-[5px]"
        >
          <IconGlyph name={node.icon} size={12} className="shrink-0 text-ink-faint" />
          <span
            className={cn(
              "truncate text-[12px] transition-colors",
              isActive ? "font-medium text-ink" : "text-ink-muted group-hover:text-ink",
            )}
          >
            {node.title}
          </span>
        </Link>

        <div
          className={cn(
            "flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100",
            isActive && "opacity-100",
          )}
        >
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onCreateChild(node.id);
              }}
              className="rounded p-0.5 text-ink-faint hover:text-ink"
              title="Add subpage"
            >
              <Plus size={11} strokeWidth={1.75} />
            </button>
          )}
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onToggleFavorite(node);
            }}
            className={cn(
              "rounded p-0.5 transition-colors hover:text-neon-emerald",
              node.isFavorite ? "text-neon-emerald" : "text-ink-faint",
            )}
            title={node.isFavorite ? "Remove favorite" : "Add favorite"}
          >
            <Pin size={10} strokeWidth={1.75} fill={node.isFavorite ? "currentColor" : "none"} />
          </button>
          {canEdit && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onDelete(node);
              }}
              className="rounded p-0.5 text-ink-faint hover:text-neon-coral"
              title="Delete page"
            >
              <Trash2 size={10} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {hasChildren && isOpen && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden"
        >
          {node.children.map((child) => (
            <TreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              slug={slug}
              expanded={expanded}
              activeId={activeId}
              canEdit={canEdit}
              onToggle={onToggle}
              onNavigate={onNavigate}
              onCreateChild={onCreateChild}
              onToggleFavorite={onToggleFavorite}
              onDelete={onDelete}
            />
          ))}
        </motion.div>
      )}
    </div>
  );
}
