"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Wifi, WifiOff } from "lucide-react";
import { initials } from "@/lib/utils";
import type { ConnectionStatus, PresenceUser } from "./use-presence";

export function PresenceBar({
  users,
  status,
}: {
  users: PresenceUser[];
  status: ConnectionStatus;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = users.slice(0, 4);
  const overflow = users.length - visible.length;
  const connected = status === "connected";

  return (
    <div
      className="relative flex items-center gap-2"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      <div className="hidden items-center -space-x-2 sm:flex">
        {visible.map((user, index) => (
          <motion.div
            key={`${user.id}-${user.clientId}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 400, damping: 26 }}
            className="relative"
          >
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full border-2 border-canvas text-[9px] font-bold text-[#0b0d10]"
              style={{
                backgroundColor: user.color,
                boxShadow: `0 0 0 1px ${user.color}55, 0 0 16px ${user.color}33`,
              }}
              title={`${user.name}${user.isLocal ? " (you)" : ""}`}
            >
              {initials(user.name)}
            </span>
            <span
              className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-2 border-canvas bg-neon-emerald"
              style={{ boxShadow: "0 0 8px rgba(52,211,153,0.6)" }}
            />
          </motion.div>
        ))}
        {overflow > 0 && (
          <span className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-canvas bg-surface-raised text-[9px] font-semibold text-ink-muted">
            +{overflow}
          </span>
        )}
      </div>

      <span
        className={`flex items-center gap-1.5 rounded-full border px-2 py-1 text-[9px] font-semibold transition-colors ${
          connected
            ? "border-neon-emerald/20 bg-neon-emerald/[0.07] text-neon-emerald"
            : status === "connecting"
              ? "border-neon-amber/20 bg-neon-amber/[0.06] text-neon-amber"
              : "border-line bg-tint-2 text-ink-faint"
        }`}
        title={
          connected
            ? `${users.length} ${users.length === 1 ? "person" : "people"} connected`
            : status === "connecting"
              ? "Connecting to the realtime gateway"
              : "Offline — edits will sync on reconnect"
        }
      >
        {connected ? <span className="live-dot" /> : status === "connecting" ? <Wifi size={10} /> : <WifiOff size={10} />}
        <span className="hidden sm:inline">
          {connected ? "Live" : status === "connecting" ? "Connecting" : "Offline"}
        </span>
      </span>

      {expanded && users.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="absolute right-0 top-full z-40 mt-2 w-56 overflow-hidden rounded-xl border border-line-bright bg-surface/95 p-1.5 shadow-panel backdrop-blur-xl"
        >
          <p className="px-2 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            In this page
          </p>
          {users.map((user) => (
            <div key={`${user.id}-${user.clientId}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5">
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[7px] font-bold text-[#0b0d10]"
                style={{ backgroundColor: user.color }}
              >
                {initials(user.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[10.5px] font-medium text-ink">
                  {user.name}
                  {user.isLocal && <span className="ml-1 text-[8px] text-ink-faint">you</span>}
                </p>
                {user.title && <p className="truncate text-[8.5px] text-ink-faint">{user.title}</p>}
              </div>
              <span className="h-1.5 w-1.5 rounded-full bg-neon-emerald" />
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
