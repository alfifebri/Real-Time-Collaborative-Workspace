"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWorkspaceUI } from "./workspace-ui";

export function NewPageButton({
  workspaceId,
  workspaceSlug,
  label = "New page",
}: {
  workspaceId: string;
  workspaceSlug: string;
  label?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (loading) return;
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <button type="button" onClick={create} className="button-primary">
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} strokeWidth={1.75} />}
      {label}
    </button>
  );
}

export function SearchPagesButton({ className }: { className?: string }) {
  const { openCommandPalette } = useWorkspaceUI();
  return (
    <button
      type="button"
      onClick={openCommandPalette}
      className={cn("button-secondary justify-start", className ?? "w-full")}
    >
      <Search size={14} strokeWidth={1.75} className="text-ink-faint" />
      Search pages
      <span className="ml-auto font-mono text-[10px] text-ink-faint">⌘K</span>
    </button>
  );
}
