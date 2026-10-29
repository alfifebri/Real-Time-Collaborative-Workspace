"use client";

import { useEffect, useState } from "react";
import * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { DocumentPageData, EditorUser } from "@/lib/types";
import { getRealtimeUrl } from "@/lib/ws-url";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { EditorExperience } from "./editor-experience";

type Connection = {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
};

export function DocumentWorkspace({
  data,
  user,
  realtimeToken,
}: {
  data: DocumentPageData;
  user: EditorUser;
  realtimeToken: string;
}) {
  const [connection, setConnection] = useState<Connection | null>(null);

  useEffect(() => {
    const ydoc = new Y.Doc();
    const provider = new WebsocketProvider(getRealtimeUrl(), data.document.id, ydoc, {
      params: { token: realtimeToken },
      connect: true,
      resyncInterval: 5000,
    });

    provider.awareness.setLocalStateField("user", {
      id: user.id,
      name: user.name,
      color: user.color,
      title: user.title,
    });

    setConnection({ ydoc, provider });

    return () => {
      provider.destroy();
      ydoc.destroy();
      setConnection((current) => (current?.provider === provider ? null : current));
    };
  }, [data.document.id, realtimeToken, user.id, user.name, user.color, user.title]);

  if (!connection) {
    return <EditorSkeleton title={data.document.title} icon={data.document.icon} />;
  }

  return (
    <EditorExperience
      data={data}
      user={user}
      ydoc={connection.ydoc}
      provider={connection.provider}
    />
  );
}

function EditorSkeleton({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="min-h-dvh bg-canvas">
      <div className="sticky top-0 z-30 flex h-12 items-center gap-2 border-b border-line bg-canvas/80 px-4 backdrop-blur">
        <div className="h-4 w-24 rounded skeleton" />
        <div className="ml-auto flex gap-2">
          <div className="h-6 w-16 rounded-full skeleton" />
          <div className="h-7 w-20 rounded-lg skeleton" />
        </div>
      </div>
      <div className="mx-auto max-w-[860px] px-5 pt-10 sm:px-10">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-line bg-tint-2 text-ink-muted">
            <IconGlyph name={icon} size={22} strokeWidth={1.5} />
          </span>
          <div>
            <h1 className="font-sans text-3xl font-semibold tracking-[-0.035em] text-ink">{title}</h1>
            <div className="mt-2 h-2.5 w-36 rounded skeleton" />
          </div>
        </div>
        <div className="mt-10 space-y-3">
          <div className="h-3.5 w-3/4 rounded skeleton" />
          <div className="h-3.5 w-full rounded skeleton" />
          <div className="h-3.5 w-5/6 rounded skeleton" />
          <div className="mt-6 h-3.5 w-2/3 rounded skeleton" />
          <div className="h-3.5 w-full rounded skeleton" />
          <div className="h-3.5 w-4/5 rounded skeleton" />
        </div>
      </div>
    </div>
  );
}
