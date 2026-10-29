"use client";

import { useEffect, useState } from "react";
import type { WebsocketProvider } from "y-websocket";
import type { EditorUser } from "@/lib/types";

export type PresenceUser = {
  clientId: number;
  id: string;
  name: string;
  color: string;
  title?: string | null;
  isLocal: boolean;
};

export type ConnectionStatus = "connecting" | "connected" | "disconnected";

export function usePresence(provider: WebsocketProvider, localUser: EditorUser) {
  const [users, setUsers] = useState<PresenceUser[]>([
    {
      clientId: -1,
      id: localUser.id,
      name: localUser.name,
      color: localUser.color,
      title: localUser.title,
      isLocal: true,
    },
  ]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const awareness = provider.awareness;

    const read = () => {
      const seen = new Map<string, PresenceUser>();
      for (const [clientId, state] of awareness.getStates()) {
        const user = state.user as
          | { id?: string; name?: string; color?: string; title?: string | null }
          | undefined;
        if (!user?.name) continue;
        const key = user.id ?? `client-${clientId}`;
        if (seen.has(key)) continue;
        seen.set(key, {
          clientId,
          id: user.id ?? `client-${clientId}`,
          name: user.name,
          color: user.color ?? "#22D3EE",
          title: user.title ?? null,
          isLocal: clientId === awareness.clientID,
        });
      }

      if (!seen.has(localUser.id)) {
        seen.set(localUser.id, {
          clientId: awareness.clientID,
          id: localUser.id,
          name: localUser.name,
          color: localUser.color,
          title: localUser.title,
          isLocal: true,
        });
      }

      const next = Array.from(seen.values()).sort((a, b) => {
        if (a.isLocal) return -1;
        if (b.isLocal) return 1;
        return a.name.localeCompare(b.name);
      });
      setUsers(next);
    };

    const onStatus = ({ status }: { status: string }) => {
      if (status === "connected") setStatus("connected");
      else if (status === "connecting") setStatus("connecting");
      else setStatus("disconnected");
    };
    const onSync = (isSynced: boolean) => setSynced(isSynced);

    awareness.on("change", read);
    read();
    provider.on("status", onStatus);
    provider.on("sync", onSync);
    setStatus(provider.wsconnected ? "connected" : provider.wsconnecting ? "connecting" : "disconnected");

    return () => {
      awareness.off("change", read);
      provider.off("status", onStatus);
      provider.off("sync", onSync);
    };
  }, [provider, localUser.id, localUser.name, localUser.color, localUser.title]);

  return { users, status, synced };
}
