"use client";

import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlertTriangle,
  Camera,
  Check,
  Clock3,
  Loader2,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import type { VersionSummary } from "@/lib/types";
import type { JSONContent } from "@tiptap/core";
import { cn, formatDate, formatTime, relativeTime } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Callout } from "./extensions/callout";

type VersionDetail = VersionSummary & { content: JSONContent };

type VersionHistoryModalProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  versions: VersionSummary[];
  canEdit: boolean;
  onSaveSnapshot: () => Promise<boolean>;
  onRestored: (content: JSONContent, label: string) => void;
  onRefreshVersions: () => Promise<void>;
};

export function VersionHistoryModal({
  open,
  onClose,
  documentId,
  versions,
  canEdit,
  onSaveSnapshot,
  onRestored,
  onRefreshVersions,
}: VersionHistoryModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!open) return;
    setConfirming(false);
    const first = versions[0]?.id ?? null;
    setSelectedId((current) => current ?? first);
  }, [open, versions]);

  useEffect(() => {
    if (!open || !selectedId) return;
    let cancelled = false;
    setLoading(true);
    setConfirming(false);
    fetch(`/api/documents/${documentId}/versions/${selectedId}`)
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not load version");
        if (!cancelled) setDetail(payload.version as VersionDetail);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error instanceof Error ? error.message : "Could not load version");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedId, documentId]);

  useEffect(() => {
    if (open && versions[0] && !selectedId) setSelectedId(versions[0].id);
  }, [open, versions, selectedId]);

  const save = async () => {
    setSaving(true);
    const ok = await onSaveSnapshot();
    setSaving(false);
    if (ok) {
      await onRefreshVersions();
    }
  };

  const restore = async () => {
    if (!detail || restoring) return;
    setRestoring(true);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${detail.id}/restore`,
        { method: "POST" },
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not restore version");
      onRestored(payload.content as JSONContent, payload.label as string);
      await onRefreshVersions();
      setConfirming(false);
      toast.success("Version restored for everyone");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not restore version");
    } finally {
      setRestoring(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Version history"
      description="Every snapshot is restorable. Restores propagate live to everyone editing this page."
      className="max-w-4xl"
    >
      <div className="grid h-[62vh] min-h-[420px] grid-cols-1 md:grid-cols-[270px_minmax(0,1fr)]">
        <div className="flex min-h-0 flex-col border-b border-line md:border-b-0 md:border-r">
          <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
            <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
              Snapshots
            </span>
            {canEdit && (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="flex items-center gap-1 rounded-md border border-line bg-tint-2 px-2 py-1 text-[9.5px] text-ink-muted transition-colors hover:border-line-bright hover:text-ink"
              >
                {saving ? <Loader2 size={10} className="animate-spin" /> : <Camera size={10} />}
                Save now
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {versions.length === 0 && (
              <div className="mt-8 px-4 text-center">
                <Clock3 size={18} className="mx-auto text-ink-faint" />
                <p className="mt-2 text-[11px] text-ink-muted">No snapshots yet</p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-ink-faint">
                  Save one now or wait for the five minute automatic snapshot.
                </p>
              </div>
            )}
            {versions.map((version) => (
              <button
                key={version.id}
                type="button"
                onClick={() => setSelectedId(version.id)}
                className={cn(
                  "mb-1 w-full rounded-lg border px-2.5 py-2 text-left transition-colors",
                  selectedId === version.id
                    ? "border-neon-emerald/20 bg-neon-emerald/[0.045]"
                    : "border-transparent hover:bg-tint-3",
                )}
              >
                <div className="flex items-center gap-1.5">
                  <span
                    className={cn(
                      "rounded border px-1 py-px text-[7.5px] font-semibold uppercase tracking-wide",
                      version.kind === "AUTO"
                        ? "border-line bg-tint-2 text-ink-faint"
                        : "border-neon-indigo/20 bg-neon-indigo/[0.06] text-neon-indigo",
                    )}
                  >
                    {version.kind === "AUTO" ? "Auto" : "Manual"}
                  </span>
                  <span className="ml-auto text-[8px] text-ink-faint">
                    {relativeTime(version.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 truncate text-[10.5px] font-medium text-ink">
                  {version.label}
                </p>
                <p className="mt-0.5 flex items-center gap-1 text-[8.5px] text-ink-faint">
                  <UserRound size={8} />
                  {version.author?.name ?? "System"}
                </p>
              </button>
            ))}
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 size={18} className="animate-spin text-ink-faint" />
            </div>
          ) : detail ? (
            <>
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-semibold text-ink">{detail.label}</p>
                  <p className="text-[9.5px] text-ink-faint">
                    {formatDate(detail.createdAt)} at {formatTime(detail.createdAt)} ·{" "}
                    {detail.author?.name ?? "System"}
                  </p>
                </div>
                {canEdit && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {confirming ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setConfirming(false)}
                          className="rounded-md px-2 py-1 text-[9.5px] text-ink-faint hover:text-ink"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={restore}
                          disabled={restoring}
                          className="flex items-center gap-1 rounded-md bg-neon-coral px-2.5 py-1 text-[9.5px] font-semibold text-canvas disabled:opacity-50"
                        >
                          {restoring ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            <AlertTriangle size={10} />
                          )}
                          Confirm restore
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(true)}
                        className="flex items-center gap-1 rounded-md border border-line bg-tint-2 px-2.5 py-1 text-[9.5px] font-medium text-ink-muted transition-colors hover:border-line-bright hover:text-ink"
                      >
                        <RotateCcw size={10} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
              {confirming && (
                <div className="flex items-center gap-2 border-b border-neon-coral/15 bg-neon-coral/[0.045] px-4 py-2 text-[9.5px] text-neon-coral/90">
                  <AlertTriangle size={11} />
                  This replaces the current page content for every collaborator. A new snapshot is
                  saved automatically.
                </div>
              )}
              <div className="workspace-editor version-preview min-h-0 flex-1 overflow-y-auto bg-canvas-soft/70 px-5 py-5">
                <VersionPreview key={detail.id} content={detail.content} />
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-2 text-[8.5px] text-ink-faint">
                <span className="flex items-center gap-1">
                  <Check size={9} className="text-neon-emerald" /> Read-only preview
                </span>
                <span>{detail.content ? "Stored as ProseMirror JSON" : "Empty snapshot"}</span>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-[11px] text-ink-faint">
              Select a snapshot to preview it
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function VersionPreview({ content }: { content: JSONContent }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Highlight,
      TaskList,
      TaskItem,
      Table,
      TableRow,
      TableHeader,
      TableCell,
      Image,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Callout,
    ],
    content,
    editable: false,
    immediatelyRender: false,
  });

  return <EditorContent editor={editor} />;
}
