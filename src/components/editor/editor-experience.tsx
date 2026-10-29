"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Editor } from "@tiptap/core";
import { BubbleMenu, EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import LinkExtension from "@tiptap/extension-link";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";
import ImageExtension from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import CharacterCount from "@tiptap/extension-character-count";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { createLowlight, common } from "lowlight";
import type { WebsocketProvider } from "y-websocket";
import * as Y from "yjs";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bold,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  Copy,
  Download,
  FileJson,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link2,
  Loader2,
  MessageSquare,
  MoreHorizontal,
  Redo2,
  Share2,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo2,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import type { CommentThreadDTO, DocumentPageData, EditorUser } from "@/lib/types";
import { cn, relativeTime, uint8ToBase64 } from "@/lib/utils";
import { roleLabels } from "@/lib/roles";
import { useClickOutside } from "@/hooks/use-click-outside";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { Modal } from "@/components/ui/modal";
import { MobileMenuButton } from "@/components/workspace/mobile-menu-button";
import { DOC_ICONS } from "@/lib/constants";
import { CommentMark } from "./extensions/comment-mark";
import { Callout } from "./extensions/callout";
import { createSlashCommand } from "./extensions/slash-command";
import { PresenceBar } from "./presence-bar";
import { usePresence } from "./use-presence";
import { CommentsPanel, type PendingComment } from "./comments-panel";
import { VersionHistoryModal } from "./version-history-modal";
import { ShareModal } from "./share-modal";

const lowlight = createLowlight(common);

type Range = { from: number; to: number };

export function EditorExperience({
  data,
  user,
  ydoc,
  provider,
}: {
  data: DocumentPageData;
  user: EditorUser;
  ydoc: Y.Doc;
  provider: WebsocketProvider;
}) {
  const canEdit = data.canEdit;
  const canComment = data.canComment;

  const [title, setTitle] = useState(data.document.title);
  const [icon, setIcon] = useState(data.document.icon);
  const [threads, setThreads] = useState<CommentThreadDTO[]>(data.comments);
  const [versions, setVersions] = useState(data.versions);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pending, setPending] = useState<PendingComment | null>(null);
  const [activeComment, setActiveComment] = useState<string | null>(null);
  const [imageRange, setImageRange] = useState<Range | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [imageAlt, setImageAlt] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [iconOpen, setIconOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [stats, setStats] = useState({ words: 0, characters: 0, canUndo: false, canRedo: false });
  const titleRef = useRef(data.document.title);
  const savedIconRef = useRef(data.document.icon);
  const lastSnapshotText = useRef("");
  const iconRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  useClickOutside(iconRef, () => setIconOpen(false), iconOpen);
  useClickOutside(moreRef, () => setMoreOpen(false), moreOpen);

  const { users, status, synced } = usePresence(provider, user);
  const openComments = threads.filter((thread) => !thread.resolved).length;

  const slashExtension = useMemo(
    () =>
      createSlashCommand({
        onRequestImage: (range) => {
          setImageRange({ from: range.from, to: range.to });
          setImageUrl("");
          setImageAlt("");
        },
      }),
    [],
  );

  const refreshStats = useCallback((instance: Editor | null) => {
    if (!instance) return;
    setStats({
      words: instance.storage.characterCount.words(),
      characters: instance.storage.characterCount.characters(),
      canUndo: instance.can().undo(),
      canRedo: instance.can().redo(),
    });
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
        codeBlock: false,
        dropcursor: { color: "#22D3EE", width: 2 },
      }),
      CodeBlockLowlight.configure({ lowlight, defaultLanguage: "typescript" }),
      Placeholder.configure({
        placeholder: "Start writing, or type / for commands…",
      }),
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Highlight.configure({ multicolor: false }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true, lastColumnResizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      ImageExtension.configure({ inline: false, allowBase64: true }),
      CharacterCount,
      Collaboration.configure({ document: ydoc, field: "default" }),
      CollaborationCursor.configure({
        provider,
        user: { name: user.name, color: user.color },
      }),
      CommentMark,
      Callout,
      slashExtension,
    ],
    editable: canEdit,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "focus:outline-none",
        spellcheck: "true",
      },
    },
    onTransaction: ({ editor: instance }) => refreshStats(instance),
  }, [ydoc, provider]);

  useEffect(() => {
    if (!editor) return;
    provider.awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      color: user.color,
      title: user.title,
    });
    refreshStats(editor);
  }, [editor, provider, user.id, user.name, user.color, user.title, refreshStats]);

  useEffect(() => {
    editor?.setEditable(canEdit);
  }, [editor, canEdit]);

  useEffect(() => {
    document.title = `${title} · CoWork Studio`;
  }, [title]);

  const createSnapshot = useCallback(
    async (kind: "MANUAL" | "AUTO", silent = false): Promise<boolean> => {
      if (!editor || !canEdit) return false;
      try {
        const payloadState = uint8ToBase64(Y.encodeStateAsUpdate(ydoc));
        const response = await fetch(`/api/documents/${data.document.id}/versions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            content: editor.getJSON(),
            ydocState: payloadState,
            label:
              kind === "MANUAL"
                ? `Snapshot · ${new Date().toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}`
                : undefined,
          }),
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.error ?? "Could not save snapshot");
        const version = payload.version as {
          id: string;
          label: string;
          kind: "MANUAL" | "AUTO";
          createdAt: string;
        };
        setVersions((current) => [
          {
            ...version,
            author: { id: user.id, name: user.name, color: user.color },
          },
          ...current.filter((item) => item.id !== version.id),
        ]);
        if (!silent) toast.success("Snapshot saved");
        return true;
      } catch (error) {
        if (!silent) {
          toast.error(error instanceof Error ? error.message : "Could not save snapshot");
        }
        return false;
      }
    },
    [editor, canEdit, ydoc, data.document.id, user.id, user.name, user.color],
  );

  const snapshotRef = useRef(createSnapshot);
  snapshotRef.current = createSnapshot;

  useEffect(() => {
    if (!editor || !canEdit) return;
    const interval = window.setInterval(() => {
      const text = editor.getText();
      if (text.trim() && text !== lastSnapshotText.current) {
        lastSnapshotText.current = text;
        void snapshotRef.current("AUTO", true);
      }
    }, 5 * 60 * 1000);
    return () => window.clearInterval(interval);
  }, [editor, canEdit]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.shiftKey && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void snapshotRef.current("MANUAL");
      }
      if (modifier && event.shiftKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setCommentsOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const saveTitle = async () => {
    if (!canEdit) return;
    const next = title.trim() || "Untitled";
    setTitle(next);
    if (next === titleRef.current) return;
    try {
      const response = await fetch(`/api/documents/${data.document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: next }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not rename page");
      titleRef.current = next;
    } catch (error) {
      setTitle(titleRef.current);
      toast.error(error instanceof Error ? error.message : "Could not rename page");
    }
  };

  const saveIcon = async (nextIcon: string) => {
    if (!canEdit) return;
    const previous = savedIconRef.current;
    setIcon(nextIcon);
    setIconOpen(false);
    try {
      const response = await fetch(`/api/documents/${data.document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: nextIcon }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not update icon");
      }
      savedIconRef.current = nextIcon;
    } catch (error) {
      setIcon(previous);
      toast.error(error instanceof Error ? error.message : "Could not update icon");
    }
  };

  const createComment = async (
    body: string,
    quote: string,
    range: Range | null,
  ): Promise<boolean> => {
    if (!canComment) return false;
    try {
      const response = await fetch(`/api/documents/${data.document.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body,
          quote,
          anchorFrom: range?.from ?? null,
          anchorTo: range?.to ?? null,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not add comment");
      const comment = payload.comment as CommentThreadDTO;
      const thread: CommentThreadDTO = { ...comment, replies: [] };
      setThreads((current) => [...current, thread]);
      setActiveComment(thread.id);

      if (range && editor) {
        editor
          .chain()
          .focus()
          .setTextSelection(range)
          .setMark("comment", { commentId: thread.id })
          .run();
      }
      toast.success("Comment added");
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add comment");
      return false;
    }
  };

  const replyToComment = async (threadId: string, body: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/documents/${data.document.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, parentId: threadId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not reply");
      setThreads((current) =>
        current.map((thread) =>
          thread.id === threadId
            ? { ...thread, replies: [...thread.replies, payload.comment as CommentThreadDTO] }
            : thread,
        ),
      );
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reply");
      return false;
    }
  };

  const resolveComment = async (commentId: string, resolved: boolean) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not update comment");
      }
      setThreads((current) =>
        current.map((thread) =>
          thread.id === commentId ? { ...thread, resolved } : thread,
        ),
      );
      if (resolved) toast.success("Thread resolved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update comment");
    }
  };

  const deleteComment = async (commentId: string) => {
    try {
      const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error ?? "Could not delete comment");
      }
      setThreads((current) =>
        current
          .filter((thread) => thread.id !== commentId)
          .map((thread) => ({
            ...thread,
            replies: thread.replies.filter((reply) => reply.id !== commentId),
          })),
      );
      toast.success("Comment deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete comment");
    }
  };

  const revealComment = (thread: CommentThreadDTO) => {
    if (!editor) return;
    setCommentsOpen(true);
    setActiveComment(thread.id);

    let from: number | null = null;
    let to: number | null = null;
    editor.state.doc.descendants((node, position) => {
      if (
        node.isText &&
        node.marks.some(
          (mark) => mark.type.name === "comment" && mark.attrs.commentId === thread.id,
        )
      ) {
        if (from === null) from = position;
        to = position + node.nodeSize;
      }
    });

    if (from === null && thread.anchorFrom !== null && thread.anchorTo !== null) {
      from = thread.anchorFrom;
      to = thread.anchorTo;
    }

    if (from !== null && to !== null && to <= editor.state.doc.content.size) {
      editor.chain().setTextSelection({ from, to }).scrollIntoView().run();
      window.setTimeout(() => {
        const element = document.querySelector<HTMLElement>(
          `[data-comment-id="${thread.id}"]`,
        );
        if (element) {
          element.classList.add("comment-active");
          window.setTimeout(() => element.classList.remove("comment-active"), 2200);
        }
      }, 120);
    }
  };

  const requestComment = () => {
    if (!editor || !canComment) return;
    const { from, to } = editor.state.selection;
    if (from === to) {
      setPending(null);
      setCommentsOpen(true);
      return;
    }
    const quote = editor.state.doc.textBetween(from, to, " ");
    setPending({ from, to, quote });
    setCommentsOpen(true);
  };

  const openLinkEditor = () => {
    if (!editor) return;
    setLinkUrl(editor.getAttributes("link").href ?? "");
    setLinkOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;
    const raw = linkUrl.trim();
    const href = raw && !/^(https?:\/\/|mailto:|tel:)/i.test(raw) ? `https://${raw}` : raw;
    if (!href) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
    }
    setLinkOpen(false);
  };

  const insertImage = () => {
    if (!editor || !imageRange || !imageUrl.trim()) return;
    const src = imageUrl.trim();
    if (!/^(https?:\/\/|data:image\/)/i.test(src)) {
      toast.error("Use an http(s) image URL");
      return;
    }
    editor
      .chain()
      .focus()
      .insertContentAt(imageRange, {
        type: "image",
        attrs: { src, alt: imageAlt.trim() || "Embedded image" },
      })
      .run();
    setImageRange(null);
    setImageUrl("");
    setImageAlt("");
  };

  const refreshVersions = async () => {
    try {
      const response = await fetch(`/api/documents/${data.document.id}/versions`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not load versions");
      setVersions(payload.versions);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load versions");
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Page link copied");
    } catch {
      toast.error("Could not copy link");
    }
    setMoreOpen(false);
  };

  const exportJson = () => {
    if (!editor) return;
    const blob = new Blob([JSON.stringify(editor.getJSON(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.trim().replace(/[^\w-]+/g, "-").toLowerCase() || "page"}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setMoreOpen(false);
    toast.success("Page exported");
  };

  const handleEditorClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const mark = target.closest<HTMLElement>("[data-comment-id]");
    if (!mark) return;
    const id = mark.getAttribute("data-comment-id");
    if (!id) return;
    const thread = threads.find((item) => item.id === id);
    if (thread) revealComment(thread);
  };

  const lastUpdated = relativeTime(data.document.updatedAt);

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 flex h-12 items-center gap-1.5 border-b border-line bg-canvas/80 px-3 backdrop-blur-xl sm:px-4">
        <MobileMenuButton className="-ml-1" />
        <Link
          href={`/w/${data.workspace.slug}`}
          className="hidden h-7 items-center gap-1.5 rounded-md px-1.5 text-[10.5px] text-ink-muted transition-colors hover:bg-tint-3 hover:text-ink sm:flex"
        >
          <ArrowLeft size={12} />
          <span
            className="flex h-4 w-4 items-center justify-center rounded"
            style={{ color: data.workspace.accent }}
          >
            <IconGlyph name={data.workspace.icon} size={11} />
          </span>
          {data.workspace.name}
        </Link>
        <ChevronRight size={10} className="hidden text-ink-faint sm:block" />
        <div className="hidden min-w-0 items-center gap-1 sm:flex">
          {data.breadcrumbs.slice(-1).map((crumb) => (
            <Link
              key={crumb.id}
              href={`/w/${data.workspace.slug}/d/${crumb.id}`}
              className="max-w-[180px] truncate rounded px-1 text-[10.5px] text-ink-faint transition-colors hover:text-ink-muted"
            >
              {crumb.title}
            </Link>
          ))}
          <ChevronRight size={10} className="text-ink-faint" />
          <span className="max-w-[220px] truncate px-1 text-[10.5px] font-medium text-ink">
            {title}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <span className="mr-1 hidden items-center gap-1 text-[9px] text-ink-faint lg:flex">
            {status === "connected" && synced ? (
              <>
                <Check size={10} className="text-neon-emerald" /> Synced
              </>
            ) : status === "connecting" ? (
              <>
                <Loader2 size={10} className="animate-spin" /> Syncing
              </>
            ) : (
              <>
                <span className="h-1 w-1 rounded-full bg-neon-amber" /> Offline
              </>
            )}
          </span>

          <PresenceBar users={users} status={status} />

          <div className="mx-1 hidden h-4 w-px bg-line sm:block" />

          <button
            type="button"
            onClick={() => setCommentsOpen((value) => !value)}
            className={cn(
              "relative flex h-8 items-center gap-1.5 rounded-lg px-2 transition-colors",
              commentsOpen
                ? "bg-tint-5 text-ink"
                : "text-ink-muted hover:bg-tint-4 hover:text-ink",
            )}
            title="Comments (⌘⇧M)"
          >
            <MessageSquare size={14} />
            {openComments > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-violet/20 px-1 text-[8.5px] font-semibold text-neon-violet">
                {openComments}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setVersionsOpen(true)}
            className="hidden h-8 items-center gap-1.5 rounded-lg px-2 text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink sm:flex"
            title="Version history"
          >
            <Clock3 size={14} />
          </button>

          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-tint-2 px-2.5 text-[10px] font-medium text-ink-muted transition-colors hover:border-line-bright hover:text-ink"
          >
            <Share2 size={12} />
            <span className="hidden sm:inline">Share</span>
          </button>

          <div ref={moreRef} className="relative">
            <button
              type="button"
              onClick={() => setMoreOpen((value) => !value)}
              className="icon-button"
              aria-label="More options"
            >
              <MoreHorizontal size={15} />
            </button>
            <AnimatePresence>
              {moreOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -3, scale: 0.985 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-full z-50 mt-1.5 w-48 rounded-xl border border-line-bright bg-surface/95 p-1.5 shadow-panel backdrop-blur-xl"
                >
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink"
                  >
                    <Copy size={12} /> Copy page link
                  </button>
                  <button
                    type="button"
                    onClick={exportJson}
                    className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink"
                  >
                    <FileJson size={12} /> Export as JSON
                  </button>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => {
                        setMoreOpen(false);
                        void createSnapshot("MANUAL");
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[10.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink"
                    >
                      <Download size={12} /> Save snapshot
                    </button>
                  )}
                  <div className="my-1 h-px bg-line" />
                  <div className="flex items-center justify-between px-2.5 py-1 text-[8.5px] text-ink-faint">
                    <span>Words</span>
                    <span className="font-mono">{stats.words}</span>
                  </div>
                  <div className="flex items-center justify-between px-2.5 py-1 text-[8.5px] text-ink-faint">
                    <span>Characters</span>
                    <span className="font-mono">{stats.characters}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-[900px] px-5 pb-28 pt-8 sm:px-10 sm:pt-10">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-[9.5px] text-ink-faint">
          <span className="soft-pill px-2 py-0.5 text-[8.5px]">
            {roleLabels[data.role]}
          </span>
          <span>Last edited {lastUpdated}</span>
          <span className="h-1 w-1 rounded-full bg-line-bright" />
          <span className="flex items-center gap-1">
            <span className="live-dot scale-[0.65]" />
            {users.length} {users.length === 1 ? "person" : "people"} here
          </span>
          {!canEdit && (
            <span className="rounded-full border border-neon-amber/20 bg-neon-amber/[0.06] px-2 py-0.5 text-[8.5px] font-medium text-neon-amber">
              Read-only
            </span>
          )}
        </div>

        <div className="flex items-start gap-3">
          <div ref={iconRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => canEdit && setIconOpen((value) => !value)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border border-transparent text-ink-muted transition-colors",
                canEdit && "hover:border-line hover:bg-tint-3 hover:text-ink",
              )}
              disabled={!canEdit}
              aria-label="Change page icon"
            >
              <IconGlyph name={icon} size={30} strokeWidth={1.5} />
            </button>
            <AnimatePresence>
              {iconOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -3, scale: 0.985 }}
                  transition={{ duration: 0.16 }}
                  className="absolute left-0 top-full z-30 mt-1.5 grid w-[248px] grid-cols-8 gap-1 rounded-xl border border-line bg-surface p-2 shadow-panel"
                >
                  {DOC_ICONS.map((glyph) => (
                    <button
                      key={glyph}
                      type="button"
                      onClick={() => saveIcon(glyph)}
                      className={cn(
                        "flex h-6 w-6 items-center justify-center rounded text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink",
                        glyph === icon && "bg-tint-5 text-ink",
                      )}
                      aria-label={glyph}
                    >
                      <IconGlyph name={glyph} size={13} />
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="min-w-0 flex-1">
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setTitle(titleRef.current);
                  event.currentTarget.blur();
                }
              }}
              readOnly={!canEdit}
              className="w-full bg-transparent font-sans text-[2rem] font-semibold leading-tight tracking-[-0.04em] text-ink outline-none placeholder:text-ink-faint sm:text-[2.5rem]"
              placeholder="Untitled"
              aria-label="Page title"
            />
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] text-ink-faint">
              <span className="flex items-center gap-1.5">
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6px] font-bold text-[#0b0d10]"
                  style={{ backgroundColor: user.color }}
                >
                  {user.name.charAt(0)}
                </span>
                Created by {data.document.creatorName}
              </span>
              <span className="h-1 w-1 rounded-full bg-line-bright" />
              <span>{stats.words} words</span>
              <span className="h-1 w-1 rounded-full bg-line-bright" />
              <span className="flex items-center gap-1">
                <Check size={9} className="text-neon-emerald" /> Autosaved
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <EditorContent
            editor={editor}
            className="workspace-editor"
            onClick={handleEditorClick}
          />
        </div>
      </div>

      {editor && (
        <BubbleMenu
          editor={editor}
          tippyOptions={{ duration: 140, placement: "top", maxWidth: "none" }}
          shouldShow={({ state, from, to }) =>
            from !== to && (canEdit || canComment) && state.doc.textBetween(from, to).trim().length > 0
          }
          className="flex items-center gap-0.5 rounded-xl border border-line-bright bg-surface/95 p-1 shadow-float backdrop-blur-xl"
        >
          <SelectionToolbar
            editor={editor}
            canEdit={canEdit}
            canComment={canComment}
            onComment={requestComment}
            onLink={openLinkEditor}
          />
        </BubbleMenu>
      )}

      <AnimatePresence>
        {editor && !commentsOpen && !versionsOpen && !shareOpen && !imageRange && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-1/2 z-30 hidden -translate-x-1/2 items-center gap-0.5 rounded-xl border border-line-bright bg-surface/90 p-1 shadow-float backdrop-blur-xl md:flex"
          >
            <button
              type="button"
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!stats.canUndo}
              className="icon-button disabled:opacity-30"
              title="Undo"
            >
              <Undo2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!stats.canRedo}
              className="icon-button disabled:opacity-30"
              title="Redo"
            >
              <Redo2 size={13} />
            </button>
            <span className="mx-1 h-4 w-px bg-line" />
            <button
              type="button"
              onClick={() => {
                editor.chain().focus().insertContent("/").run();
              }}
              disabled={!canEdit}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[9.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink disabled:opacity-30"
              title="Insert block"
            >
              <span className="font-mono text-[10px] text-neon-emerald/80">/</span> Blocks
            </button>
            <button
              type="button"
              onClick={requestComment}
              disabled={!canComment}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[9.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink disabled:opacity-30"
              title="Comment on selection"
            >
              <MessageSquare size={12} /> Comment
            </button>
            <button
              type="button"
              onClick={() => void createSnapshot("MANUAL")}
              disabled={!canEdit}
              className="flex h-8 items-center gap-1.5 rounded-lg px-2 text-[9.5px] text-ink-muted transition-colors hover:bg-tint-4 hover:text-ink disabled:opacity-30"
              title="Save snapshot (⌘⇧S)"
            >
              <Clock3 size={12} /> Snapshot
            </button>
            <span className="mx-1 h-4 w-px bg-line" />
            <span className="px-2 font-mono text-[9px] text-ink-faint">{stats.words}w</span>
          </motion.div>
        )}
      </AnimatePresence>

      <CommentsPanel
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        threads={threads}
        user={user}
        canComment={canComment}
        canManage={data.canManage}
        pending={pending}
        onClearPending={() => setPending(null)}
        onCreate={createComment}
        onReply={replyToComment}
        onResolve={resolveComment}
        onDelete={deleteComment}
        onReveal={revealComment}
        activeId={activeComment}
      />

      <VersionHistoryModal
        open={versionsOpen}
        onClose={() => setVersionsOpen(false)}
        documentId={data.document.id}
        versions={versions}
        canEdit={canEdit}
        onSaveSnapshot={() => createSnapshot("MANUAL")}
        onRestored={(content) => {
          if (!editor) return;
          editor.commands.setContent(content, true);
          editor.commands.focus("start");
        }}
        onRefreshVersions={refreshVersions}
      />

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        documentId={data.document.id}
        workspaceId={data.workspace.id}
        workspaceName={data.workspace.name}
        canManage={data.canManage}
      />

      <Modal
        open={Boolean(imageRange)}
        onClose={() => {
          setImageRange(null);
          setImageUrl("");
          setImageAlt("");
        }}
        title="Embed an image"
        description="Paste a direct image URL. It will render for everyone in the page."
        className="max-w-md"
      >
        <div className="space-y-3.5 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">Image URL</span>
            <input
              value={imageUrl}
              onChange={(event) => setImageUrl(event.target.value)}
              className="field text-xs"
              placeholder="https://images.unsplash.com/…"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">
              Alt text <span className="text-ink-faint">(optional)</span>
            </span>
            <input
              value={imageAlt}
              onChange={(event) => setImageAlt(event.target.value)}
              className="field text-xs"
              placeholder="A short description of the image"
            />
          </label>
          {imageUrl.trim() && /^https?:\/\//i.test(imageUrl.trim()) && (
            <div className="overflow-hidden rounded-lg border border-line bg-tint-2 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl.trim()}
                alt={imageAlt || "Image preview"}
                className="max-h-36 w-full rounded object-cover"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              className="button-secondary"
              onClick={() => {
                setImageRange(null);
                setImageUrl("");
                setImageAlt("");
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={insertImage}
              disabled={!imageUrl.trim()}
            >
              <ImageIcon size={14} /> Insert image
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        title="Add a link"
        description="Link the selected text. Leave the field empty to remove the link."
        className="max-w-md"
      >
        <div className="space-y-3.5 px-5 py-4">
          <label className="block">
            <span className="mb-1.5 block text-[10.5px] font-medium text-ink-muted">URL</span>
            <div className="relative">
              <Link2
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                value={linkUrl}
                onChange={(event) => setLinkUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                }}
                className="field pl-9 text-xs"
                placeholder="https://example.com"
                autoFocus
              />
            </div>
          </label>
          <div className="flex justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                setLinkOpen(false);
              }}
              className="inline-flex items-center gap-1 text-[10px] text-ink-faint transition-colors hover:text-neon-coral"
            >
              <Unlink size={11} /> Remove link
            </button>
            <div className="flex gap-2">
              <button type="button" className="button-secondary" onClick={() => setLinkOpen(false)}>
                Cancel
              </button>
              <button type="button" className="button-primary" onClick={applyLink}>
                Apply
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function SelectionToolbar({
  editor,
  canEdit,
  canComment,
  onComment,
  onLink,
}: {
  editor: Editor;
  canEdit: boolean;
  canComment: boolean;
  onComment: () => void;
  onLink: () => void;
}) {
  const active = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance.isActive("bold"),
      italic: instance.isActive("italic"),
      underline: instance.isActive("underline"),
      strike: instance.isActive("strike"),
      code: instance.isActive("code"),
      highlight: instance.isActive("highlight"),
      link: instance.isActive("link"),
    }),
  });

  const Button = ({
    active: isActive,
    onClick,
    label,
    children,
  }: {
    active?: boolean;
    onClick: () => void;
    label: string;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md transition-colors",
        isActive
          ? "bg-neon-emerald/10 text-neon-emerald"
          : "text-ink-muted hover:bg-tint-4 hover:text-ink",
      )}
    >
      {children}
    </button>
  );

  return (
    <>
      {canEdit && (
        <>
          <Button
            active={active.bold}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          >
            <Bold size={13} />
          </Button>
          <Button
            active={active.italic}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <Italic size={13} />
          </Button>
          <Button
            active={active.underline}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            label="Underline"
          >
            <UnderlineIcon size={13} />
          </Button>
          <Button
            active={active.strike}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            label="Strikethrough"
          >
            <Strikethrough size={13} />
          </Button>
          <Button
            active={active.code}
            onClick={() => editor.chain().focus().toggleCode().run()}
            label="Inline code"
          >
            <Code2 size={13} />
          </Button>
          <Button
            active={active.highlight}
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            label="Highlight"
          >
            <Highlighter size={13} />
          </Button>
          <Button active={active.link} onClick={onLink} label="Link">
            <Link2 size={13} />
          </Button>
          <span className="mx-0.5 h-4 w-px bg-line" />
        </>
      )}
      {canComment && (
        <button
          type="button"
          onClick={onComment}
          className="ml-0.5 flex h-7 items-center gap-1.5 rounded-md bg-neon-violet/10 px-2 text-[9.5px] font-medium text-neon-violet transition-colors hover:bg-neon-violet/15"
        >
          <MessageSquare size={11} /> Comment
        </button>
      )}
      {!canEdit && !canComment && (
        <span className="px-2 py-1 text-[9px] text-ink-faint">Read-only</span>
      )}
    </>
  );
}
