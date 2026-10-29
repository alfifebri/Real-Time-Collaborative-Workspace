"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, ChevronDown, Database, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

const DETAILS = [
  ["Protocol", "Yjs v13 · CRDT"],
  ["Transport", "WebSocket"],
  ["Publish", "Redis pub/sub"],
  ["Latency", "38 ms p50"],
] as const;

export function RealtimeStatus() {
  const [open, setOpen] = useState(true);

  return (
    <section className="overflow-hidden rounded-2xl panel-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 text-left transition-colors hover:bg-tint-2"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neon-emerald/20 bg-neon-emerald/[0.07] text-neon-emerald">
          <Radio size={14} strokeWidth={1.75} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11.5px] font-medium text-ink">Realtime gateway</span>
          <span className="block text-[9.5px] text-ink-faint">Yjs · Redis pub/sub</span>
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neon-emerald/20 bg-neon-emerald/[0.06] px-2 py-0.5 text-[9px] font-medium text-neon-emerald">
          <span className="live-dot scale-75" /> Healthy
        </span>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className={cn(
            "shrink-0 text-ink-faint transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line px-4 py-3.5">
              <div className="grid grid-cols-2 gap-1.5">
                {DETAILS.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-line/70 bg-tint-1 px-2.5 py-2"
                  >
                    <p className="text-[8.5px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                      {key}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-ink-muted">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[9px] text-ink-faint">
                <span className="flex items-center gap-1.5">
                  <Activity size={10} strokeWidth={1.75} className="text-neon-emerald" />
                  3 sync nodes
                </span>
                <span className="flex items-center gap-1.5">
                  <Database size={10} strokeWidth={1.75} />
                  Postgres snapshots
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
