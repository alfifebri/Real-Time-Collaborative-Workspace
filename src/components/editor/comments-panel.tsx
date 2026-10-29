"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CheckCircle2,
  CornerDownRight,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
  X,
} from "lucide-react";
import type { CommentThreadDTO } from "@/lib/types";
import type { EditorUser } from "@/lib/types";
import { cn, initials, relativeTime } from "@/lib/utils";

export type PendingComment = {
  quote: string;
  from: number;
  to: number;
};

type CommentsPanelProps = {
  open: boolean;
  onClose: () => void;
  threads: CommentThreadDTO[];
  user: EditorUser;
  canComment: boolean;
  canManage: boolean;
  pending: PendingComment | null;
  onClearPending: () => void;
  onCreate: (body: string, quote: string, range: { from: number; to: number } | null) => Promise<boolean>;
  onReply: (threadId: string, body: string) => Promise<boolean>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReveal: (thread: CommentThreadDTO) => void;
  activeId: string | null;
};

export function CommentsPanel({
  open,
  onClose,
  threads,
  user,
  canComment,
  canManage,
  pending,
  onClearPending,
  onCreate,
  onReply,
  onResolve,
  onDelete,
  onReveal,
  activeId,
}: CommentsPanelProps) {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const openThreads = threads.filter((thread) => !thread.resolved);
  const resolvedThreads = threads.filter((thread) => thread.resolved);
  const visible = tab === "open" ? openThreads : resolvedThreads;

  useEffect(() => {
    if (pending) {
      setTab("open");
      setTimeout(() => textareaRef.current?.focus(), 180);
    }
  }, [pending]);

  const submit = async () => {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const ok = await onCreate(
      body.trim(),
      pending?.quote ?? "",
      pending ? { from: pending.from, to: pending.to } : null,
    );
    if (ok) {
      setBody("");
      onClearPending();
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close comments"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[55] bg-black/50 backdrop-blur-[1px] lg:hidden"
          />
          <motion.aside
            initial={{ x: 400, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 400, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed right-0 top-0 z-[56] flex h-dvh w-full max-w-[400px] flex-col border-l border-line bg-canvas-soft shadow-[-24px_0_60px_-30px_rgba(0,0,0,0.9)]"
          >
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-4">
              <MessageSquare size={15} className="text-ink-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-semibold text-ink">Comments</p>
                <p className="text-[9.5px] text-ink-faint">
                  {openThreads.length} open · {resolvedThreads.length} resolved
                </p>
              </div>
              <button type="button" onClick={onClose} className="icon-button" aria-label="Close comments">
                <X size={15} />
              </button>
            </header>

            <div className="flex shrink-0 gap-1 border-b border-line px-3 py-2">
              {(["open", "resolved"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTab(value)}
                  className={cn(
                    "rounded-md px-2.5 py-1 text-[10px] font-medium transition-colors",
                    tab === value
                      ? "bg-tint-5 text-ink"
                      : "text-ink-faint hover:text-ink-muted",
                  )}
                >
                  {value === "open" ? "Open" : "Resolved"}
                  <span className="ml-1.5 text-[9px] text-ink-faint">
                    {value === "open" ? openThreads.length : resolvedThreads.length}
                  </span>
                </button>
              ))}
            </div>

            {canComment && tab === "open" && (
              <div className="shrink-0 border-b border-line p-3.5">
                <div className="rounded-xl border border-line bg-tint-2 p-2.5">
                  {pending && (
                    <div className="mb-2 flex items-start gap-2 rounded-lg border border-neon-violet/20 bg-neon-violet/[0.06] px-2.5 py-2">
                      <span className="mt-0.5 h-full w-0.5 shrink-0 rounded bg-neon-violet/60" />
                      <p className="min-w-0 flex-1 line-clamp-2 text-[10px] italic leading-relaxed text-ink-muted">
                        “{pending.quote}”
                      </p>
                      <button
                        type="button"
                        onClick={onClearPending}
                        className="mt-0.5 text-ink-faint transition-colors hover:text-ink"
                        aria-label="Remove selection"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span
                      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-[#0b0d10]"
                      style={{ backgroundColor: user.color }}
                    >
                      {initials(user.name)}
                    </span>
                    <textarea
                      ref={textareaRef}
                      value={body}
                      onChange={(event) => setBody(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                          event.preventDefault();
                          void submit();
                        }
                      }}
                      placeholder={pending ? "Respond to the selection…" : "Leave a comment on this page…"}
                      rows={2}
                      className="min-h-[44px] flex-1 resize-none bg-transparent px-0.5 py-0.5 text-[11.5px] leading-relaxed text-ink outline-none placeholder:text-ink-faint"
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[8.5px] text-ink-faint">⌘↵ to send</span>
                    <button
                      type="button"
                      onClick={submit}
                      disabled={!body.trim() || submitting}
                      className="flex h-6 items-center gap-1 rounded-md bg-ink px-2 text-[9.5px] font-semibold text-canvas transition-opacity hover:opacity-90 disabled:opacity-40"
                    >
                      {submitting ? <Loader2 size={10} className="animate-spin" /> : <Send size={10} />}
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {visible.length === 0 ? (
                <div className="mt-10 flex flex-col items-center gap-2 px-6 text-center">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-tint-2">
                    <CheckCircle2 size={17} className="text-ink-faint" />
                  </span>
                  <p className="text-xs font-medium text-ink">
                    {tab === "open" ? "No open comments" : "No resolved comments yet"}
                  </p>
                  <p className="text-[10px] leading-relaxed text-ink-faint">
                    {tab === "open"
                      ? "Select text in the editor and choose Comment to start a thread."
                      : "Resolved threads will collect here."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {visible.map((thread) => (
                    <ThreadCard
                      key={thread.id}
                      thread={thread}
                      user={user}
                      canComment={canComment}
                      canManage={canManage}
                      active={activeId === thread.id}
                      onReply={onReply}
                      onResolve={onResolve}
                      onDelete={onDelete}
                      onReveal={() => onReveal(thread)}
                    />
                  ))}
                </div>
              )}
            </div>

            <footer className="flex shrink-0 items-center gap-2 border-t border-line px-4 py-2.5 text-[9px] text-ink-faint">
              <span className="live-dot scale-75" />
              Threads sync live with everyone in this page
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function ThreadCard({
  thread,
  user,
  canComment,
  canManage,
  active,
  onReply,
  onResolve,
  onDelete,
  onReveal,
}: {
  thread: CommentThreadDTO;
  user: EditorUser;
  canComment: boolean;
  canManage: boolean;
  active: boolean;
  onReply: (threadId: string, body: string) => Promise<boolean>;
  onResolve: (commentId: string, resolved: boolean) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onReveal: () => void;
}) {
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    const ok = await onReply(thread.id, reply.trim());
    if (ok) {
      setReply("");
      setReplying(false);
    }
    setSending(false);
  };

  const remove = async (id: string) => {
    setDeleting(true);
    await onDelete(id);
    setDeleting(false);
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-tint-2 p-3 transition-colors",
        active
          ? "border-neon-indigo/30 bg-neon-indigo/[0.035]"
          : "border-line hover:border-line-bright",
        thread.resolved && "opacity-65",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={onReveal}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-[#0b0d10]"
          style={{ backgroundColor: thread.author.color }}
          title={`Reveal ${thread.author.name}'s comment`}
        >
          {initials(thread.author.name)}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-[10.5px] font-semibold text-ink">
              {thread.author.name}
            </span>
            {thread.resolved && (
              <span className="flex items-center gap-0.5 rounded border border-neon-emerald/20 bg-neon-emerald/[0.06] px-1 py-px text-[7.5px] font-semibold uppercase tracking-wide text-neon-emerald">
                <Check size={7} /> Resolved
              </span>
            )}
          </div>
          <p className="text-[8.5px] text-ink-faint">{relativeTime(thread.createdAt)}</p>

          {thread.quote && (
            <button
              type="button"
              onClick={onReveal}
              className="mt-2 block w-full border-l-2 border-neon-violet/40 pl-2 text-left text-[9.5px] italic leading-relaxed text-ink-faint transition-colors hover:text-ink-muted"
            >
              “{thread.quote}”
            </button>
          )}

          <p className="mt-2 whitespace-pre-wrap text-[11px] leading-relaxed text-ink-muted">
            {thread.body}
          </p>
        </div>
      </div>

      {thread.replies.length > 0 && (
        <div className="ml-[30px] mt-2.5 space-y-2 border-l border-line pl-2.5">
          {thread.replies.map((replyItem) => (
            <div key={replyItem.id} className="group/reply flex items-start gap-1.5">
              <span
                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[6px] font-bold text-[#0b0d10]"
                style={{ backgroundColor: replyItem.author.color }}
              >
                {initials(replyItem.author.name)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9.5px] font-semibold text-ink">{replyItem.author.name}</span>
                  <span className="text-[8px] text-ink-faint">{relativeTime(replyItem.createdAt)}</span>
                  {(replyItem.author.id === user.id || canManage) && (
                    <button
                      type="button"
                      onClick={() => remove(replyItem.id)}
                      disabled={deleting}
                      className="ml-auto text-ink-faint opacity-0 transition-opacity hover:text-neon-coral group-hover/reply:opacity-100"
                      title="Delete reply"
                    >
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-[10px] leading-relaxed text-ink-muted">
                  {replyItem.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2.5 flex items-center gap-1 border-t border-line pt-2">
        {canComment && !thread.resolved && (
          <button
            type="button"
            onClick={() => setReplying((value) => !value)}
            className="flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-ink-faint transition-colors hover:bg-tint-3 hover:text-ink-muted"
          >
            <CornerDownRight size={10} /> Reply
          </button>
        )}
        {canComment && (
          <button
            type="button"
            onClick={() => onResolve(thread.id, !thread.resolved)}
            className={cn(
              "flex items-center gap-1 rounded px-1.5 py-1 text-[9px] transition-colors hover:bg-tint-3",
              thread.resolved
                ? "text-ink-faint hover:text-ink-muted"
                : "text-neon-emerald hover:text-neon-emerald/80",
            )}
          >
            <CheckCircle2 size={10} />
            {thread.resolved ? "Reopen" : "Resolve"}
          </button>
        )}
        {(thread.author.id === user.id || canManage) && (
          <button
            type="button"
            onClick={() => remove(thread.id)}
            disabled={deleting}
            className="ml-auto flex items-center gap-1 rounded px-1.5 py-1 text-[9px] text-ink-faint transition-colors hover:bg-tint-3 hover:text-neon-coral"
          >
            {deleting ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />}
          </button>
        )}
      </div>

      {replying && (
        <div className="mt-2 flex items-end gap-1.5">
          <textarea
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            placeholder="Write a reply…"
            rows={1}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendReply();
              }
            }}
            className="min-h-[30px] flex-1 resize-none rounded-lg border border-line bg-tint-2 px-2 py-1.5 text-[10.5px] text-ink outline-none placeholder:text-ink-faint focus:border-neon-emerald/40"
          />
          <button
            type="button"
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-ink text-canvas disabled:opacity-40"
          >
            {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
          </button>
        </div>
      )}
    </div>
  );
}
