"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  hideClose?: boolean;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  hideClose = false,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto px-4 py-[8vh] sm:items-center sm:py-8">
          <motion.button
            type="button"
            aria-label="Close dialog"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 cursor-default bg-black/65 backdrop-blur-[3px]"
          />
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.985 }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-line-bright bg-surface/95 shadow-panel backdrop-blur-xl",
              className,
            )}
          >
            {(title || !hideClose) && (
              <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                  {title && (
                    <h2 className="font-sans text-base font-semibold tracking-[-0.01em] text-ink">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p className="mt-1 text-xs leading-relaxed text-ink-muted">{description}</p>
                  )}
                </div>
                {!hideClose && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="icon-button -mr-1 -mt-1 shrink-0"
                    aria-label="Close"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>
            )}
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  loading?: boolean;
  destructive?: boolean;
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  loading = false,
  destructive = false,
}: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} className="max-w-md">
      <div className="flex justify-end gap-2 px-5 py-4">
        <button type="button" className="button-secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={cn(
            "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all disabled:opacity-50",
            destructive
              ? "bg-neon-coral text-canvas hover:bg-neon-coral/90"
              : "bg-ink text-canvas hover:bg-ink/90",
          )}
        >
          {loading ? "Working…" : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
