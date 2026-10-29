"use client";

import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { MemberSummary } from "@/lib/types";
import { canEditRole, roleLabels, type RoleName } from "@/lib/roles";
import { AvatarStack } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { MobileMenuButton } from "./mobile-menu-button";
import { useWorkspaceUI } from "./workspace-ui";

export function HomeHeader({
  workspaceName,
  workspaceId,
  workspaceSlug,
  role,
  members,
}: {
  workspaceName: string;
  workspaceId: string;
  workspaceSlug: string;
  role: RoleName;
  members: MemberSummary[];
}) {
  const router = useRouter();
  const { openCommandPalette } = useWorkspaceUI();
  const [creating, setCreating] = useState(false);

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
      router.push(`/w/${workspaceSlug}/d/${payload.document.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create page");
    } finally {
      setCreating(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line/80 bg-canvas/80 px-4 backdrop-blur-xl sm:px-7">
      <MobileMenuButton className="-ml-1" />
      <div className="flex min-w-0 items-center gap-1.5 text-[11.5px]">
        <span className="hidden text-ink-faint sm:inline">Workspace</span>
        <ChevronRight size={11} strokeWidth={1.75} className="hidden text-ink-faint sm:inline" />
        <span className="truncate font-medium text-ink">{workspaceName}</span>
        <span className="soft-pill ml-1 hidden sm:inline-flex">{roleLabels[role]}</span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden h-8 items-center gap-2 rounded-lg border border-line bg-tint-1 px-2.5 text-[10.5px] text-ink-faint shadow-soft-inset transition-colors hover:border-line-bright hover:bg-tint-2 hover:text-ink-muted sm:flex"
        >
          <Search size={12} strokeWidth={1.75} />
          Search
          <Kbd>⌘K</Kbd>
        </button>

        <div className="hidden items-center gap-2 sm:flex">
          <AvatarStack users={members} max={3} size="sm" />
          <span className="text-[10px] text-ink-faint">{members.length}</span>
        </div>

        {canEditRole(role) && (
          <button type="button" onClick={createPage} className="button-primary h-8 px-3 py-0 text-[11.5px]">
            {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={1.75} />}
            New page
          </button>
        )}
      </div>
    </header>
  );
}
