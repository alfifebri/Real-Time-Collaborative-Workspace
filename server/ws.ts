import "dotenv/config";

import { createServer, type IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, WebSocket, type RawData } from "ws";
import * as Y from "yjs";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import * as syncProtocol from "y-protocols/sync";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import { prisma } from "../src/lib/prisma";
import { getDocumentAccess, type DocumentAccess } from "../src/lib/permissions";
import {
  verifyRealtimeToken,
  type RealtimeIdentity,
} from "../src/lib/realtime-token";
import { redisBridge } from "./redis-bridge";

const PORT = Number(process.env.WS_PORT ?? 1234);

const messageSync = 0;
const messageAwareness = 1;
const messageAuth = 2;
const messageQueryAwareness = 3;

const INIT_ORIGIN = Symbol("postgres-snapshot");
const REDIS_ORIGIN = Symbol("redis");

type Connection = {
  socket: WebSocket;
  canWrite: boolean;
  controlledIds: Set<number>;
};

type ConnectionContext = {
  documentId: string;
  identity: RealtimeIdentity;
  access: DocumentAccess;
};

class Room {
  public readonly doc = new Y.Doc();
  public readonly awareness = new Awareness(this.doc);
  public readonly connections = new Map<WebSocket, Connection>();
  public readonly ready: Promise<void>;
  private dirty = false;
  private destroyed = false;
  private destroyTimer: NodeJS.Timeout | null = null;
  private persistTimer: NodeJS.Timeout;

  constructor(
    private readonly documentId: string,
    private readonly onDispose: (documentId: string) => void,
  ) {
    this.doc.on("update", this.handleDocUpdate);
    this.awareness.on("update", this.handleAwarenessUpdate);
    this.persistTimer = setInterval(() => {
      void this.persist();
    }, 8000);
    this.persistTimer.unref?.();
    this.ready = this.initialize();
  }

  private async initialize() {
    try {
      const document = await prisma.document.findUnique({
        where: { id: this.documentId },
        select: { ydocState: true },
      });

      if (document?.ydocState && document.ydocState.length > 0) {
        Y.applyUpdate(this.doc, new Uint8Array(document.ydocState), INIT_ORIGIN);
      }

      await redisBridge.subscribe(this.documentId, (message) => {
        if (message.kind === "update") {
          const update = new Uint8Array(Buffer.from(message.payload, "base64"));
          Y.applyUpdate(this.doc, update, REDIS_ORIGIN);
        } else {
          const update = new Uint8Array(Buffer.from(message.payload, "base64"));
          applyAwarenessUpdate(this.awareness, update, REDIS_ORIGIN);
        }
      });

      const backlog = await redisBridge.readUpdates(this.documentId);
      for (const update of backlog) {
        Y.applyUpdate(this.doc, update, REDIS_ORIGIN);
      }
    } catch (error) {
      console.error(`[room:${this.documentId}] failed to initialise`, error);
    }
  }

  connect(
    socket: WebSocket,
    identity: RealtimeIdentity,
    access: DocumentAccess,
  ) {
    if (this.destroyed) return;
    if (this.destroyTimer) {
      clearTimeout(this.destroyTimer);
      this.destroyTimer = null;
    }

    const connection: Connection = {
      socket,
      canWrite: access.canWrite,
      controlledIds: new Set<number>(),
    };
    this.connections.set(socket, connection);

    socket.on("message", (data) => {
      try {
        this.handleMessage(connection, data);
      } catch (error) {
        console.warn(`[room:${this.documentId}] malformed message`, error);
      }
    });

    socket.on("close", () => this.handleClose(socket));
    socket.on("error", () => this.handleClose(socket));

    const syncEncoder = encoding.createEncoder();
    encoding.writeVarUint(syncEncoder, messageSync);
    syncProtocol.writeSyncStep1(syncEncoder, this.doc);
    send(socket, encoding.toUint8Array(syncEncoder));

    const clientIds = Array.from(this.awareness.getStates().keys());
    if (clientIds.length > 0) {
      this.sendAwareness(socket, clientIds);
    }

    console.log(
      `[room:${this.documentId}] ${identity.name} connected (${access.role}, ${this.connections.size} peers)`,
    );
  }

  private handleMessage(connection: Connection, data: RawData) {
    const message = toUint8Array(data);
    if (message.length === 0) return;

    const peek = decoding.createDecoder(message);
    const type = decoding.readVarUint(peek);

    if (type === messageSync) {
      const syncType = decoding.readVarUint(peek);
      if (
        !connection.canWrite &&
        (syncType === syncProtocol.messageYjsSyncStep2 ||
          syncType === syncProtocol.messageYjsUpdate)
      ) {
        return;
      }

      const decoder = decoding.createDecoder(message);
      decoding.readVarUint(decoder);
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.readSyncMessage(decoder, encoder, this.doc, connection);
      if (encoding.length(encoder) > 1) {
        send(connection.socket, encoding.toUint8Array(encoder));
      }
      return;
    }

    if (type === messageAwareness) {
      const decoder = decoding.createDecoder(message);
      decoding.readVarUint(decoder);
      const update = decoding.readVarUint8Array(decoder);
      const { added, removed } = readAwarenessClients(update);
      for (const clientId of added) connection.controlledIds.add(clientId);
      for (const clientId of removed) connection.controlledIds.delete(clientId);
      applyAwarenessUpdate(this.awareness, update, connection);
      return;
    }

    if (type === messageQueryAwareness) {
      const clientIds = Array.from(this.awareness.getStates().keys());
      if (clientIds.length > 0) this.sendAwareness(connection.socket, clientIds);
      return;
    }

    if (type === messageAuth) {
      // Authentication happens during the HTTP upgrade with a signed, scoped token.
      return;
    }
  }

  private handleDocUpdate = (update: Uint8Array, origin: unknown) => {
    this.dirty = true;

    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageSync);
    syncProtocol.writeUpdate(encoder, update);
    this.broadcast(encoding.toUint8Array(encoder));

    if (origin !== REDIS_ORIGIN && origin !== INIT_ORIGIN) {
      void redisBridge.appendUpdate(
        this.documentId,
        Buffer.from(update).toString("base64"),
      );
    }
  };

  private handleAwarenessUpdate = (
    changes: { added: number[]; updated: number[]; removed: number[] },
    origin: unknown,
  ) => {
    const changed = changes.added.concat(changes.updated, changes.removed);
    if (changed.length === 0) return;

    const update = encodeAwarenessUpdate(this.awareness, changed);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(encoder, update);
    this.broadcast(encoding.toUint8Array(encoder));

    if (origin !== REDIS_ORIGIN) {
      void redisBridge.publishAwareness(
        this.documentId,
        Buffer.from(update).toString("base64"),
      );
    }
  };

  private sendAwareness(socket: WebSocket, clientIds: number[]) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, messageAwareness);
    encoding.writeVarUint8Array(
      encoder,
      encodeAwarenessUpdate(this.awareness, clientIds),
    );
    send(socket, encoding.toUint8Array(encoder));
  }

  private broadcast(message: Uint8Array) {
    for (const connection of this.connections.values()) {
      send(connection.socket, message);
    }
  }

  private handleClose(socket: WebSocket) {
    const connection = this.connections.get(socket);
    if (!connection) return;
    this.connections.delete(socket);

    if (connection.controlledIds.size > 0) {
      removeAwarenessStates(
        this.awareness,
        Array.from(connection.controlledIds),
        null,
      );
    }

    console.log(
      `[room:${this.documentId}] peer left (${this.connections.size} remaining)`,
    );

    if (this.connections.size === 0) {
      void this.persist();
      if (this.destroyTimer) clearTimeout(this.destroyTimer);
      this.destroyTimer = setTimeout(() => this.destroy(), 30_000);
      this.destroyTimer.unref?.();
    }
  }

  async persist(): Promise<void> {
    if (this.destroyed || !this.dirty) return;
    this.dirty = false;
    try {
      const state = Y.encodeStateAsUpdate(this.doc);
      await prisma.document.update({
        where: { id: this.documentId },
        data: { ydocState: Buffer.from(state) },
      });
    } catch (error) {
      this.dirty = true;
      console.warn(`[room:${this.documentId}] persistence failed`, error);
    }
  }

  private destroy() {
    if (this.destroyed) return;
    this.destroyed = true;
    clearInterval(this.persistTimer);
    if (this.destroyTimer) clearTimeout(this.destroyTimer);
    void this.persist();
    void redisBridge.unsubscribe(this.documentId);
    this.awareness.destroy();
    this.doc.destroy();
    this.onDispose(this.documentId);
    console.log(`[room:${this.documentId}] disposed`);
  }
}

const rooms = new Map<string, Room>();
const documentsInUse = new Map<string, Promise<Room>>();

function getRoom(documentId: string): Promise<Room> {
  const existing = rooms.get(documentId);
  if (existing) return Promise.resolve(existing);

  const pending = documentsInUse.get(documentId);
  if (pending) return pending;

  const room = new Room(documentId, (id) => {
    rooms.delete(id);
  });
  rooms.set(documentId, room);
  const ready = room.ready.then(() => {
    documentsInUse.delete(documentId);
    return room;
  });
  documentsInUse.set(documentId, ready);
  return ready;
}

function redisTarget(): string {
  const url = process.env.REDIS_URL;
  if (!url) return "redis://localhost:6379";
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "configured";
  }
}

function send(socket: WebSocket, message: Uint8Array) {
  if (socket.readyState !== WebSocket.OPEN) return;
  socket.send(message, (error) => {
    if (error) socket.terminate();
  });
}

function toUint8Array(data: RawData): Uint8Array {
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
}

function readAwarenessClients(update: Uint8Array): {
  added: number[];
  removed: number[];
} {
  const decoder = decoding.createDecoder(update);
  const count = decoding.readVarUint(decoder);
  const added: number[] = [];
  const removed: number[] = [];
  for (let index = 0; index < count; index += 1) {
    const clientId = decoding.readVarUint(decoder);
    decoding.readVarUint(decoder);
    const rawState = decoding.readVarString(decoder);
    try {
      const state = JSON.parse(rawState);
      if (state === null) removed.push(clientId);
      else added.push(clientId);
    } catch {
      removed.push(clientId);
    }
  }
  return { added, removed };
}

const server = createServer((request, response) => {
  if (request.url === "/health" || request.url === "/") {
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    });
    response.end(
      JSON.stringify({
        status: "ok",
        service: "cowork-realtime-gateway",
        rooms: rooms.size,
        connections: Array.from(rooms.values()).reduce(
          (total, room) => total + room.connections.size,
          0,
        ),
        redis: redisBridge.available ? "connected" : "single-node",
        uptime: Math.round(process.uptime()),
      }),
    );
    return;
  }
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "Not found" }));
});

const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", (request, socket, head) => {
  void handleUpgrade(request, socket, head);
});

async function handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer) {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
    const documentId = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    const token = url.searchParams.get("token");

    if (!documentId || !token) {
      rejectUpgrade(socket, 401, "Missing document or token");
      return;
    }

    const identity = await verifyRealtimeToken(token, documentId);
    if (!identity) {
      rejectUpgrade(socket, 403, "Invalid realtime token");
      return;
    }

    const access = await getDocumentAccess(documentId, identity.id);
    if (!access) {
      rejectUpgrade(socket, 403, "No access to this document");
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const context: ConnectionContext = { documentId, identity, access };
      wss.emit("connection", ws, request, context);
    });
  } catch (error) {
    console.error("[gateway] upgrade failed", error);
    rejectUpgrade(socket, 503, "Realtime gateway unavailable");
  }
}

function rejectUpgrade(socket: Duplex, status: number, message: string) {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Type: text/plain\r\n\r\n${message}`,
  );
  socket.destroy();
}

wss.on("connection", async (socket: WebSocket, _request: IncomingMessage, context: ConnectionContext) => {
  const room = await getRoom(context.documentId);
  if (socket.readyState !== WebSocket.OPEN) return;
  room.connect(socket, context.identity, context.access);
  (socket as WebSocket & { isAlive?: boolean }).isAlive = true;
  socket.on("pong", () => {
    (socket as WebSocket & { isAlive?: boolean }).isAlive = true;
  });
});

const heartbeat = setInterval(() => {
  for (const socket of wss.clients) {
    const tracked = socket as WebSocket & { isAlive?: boolean };
    if (tracked.isAlive === false) {
      socket.terminate();
      continue;
    }
    tracked.isAlive = false;
    socket.ping();
  }
}, 30_000);
heartbeat.unref?.();

server.listen(PORT, () => {
  console.log(`\n  CoWork realtime gateway`);
  console.log(`  → ws://localhost:${PORT}/:documentId?token=…`);
  console.log(`  → http://localhost:${PORT}/health`);
  console.log(`  → Redis: ${redisTarget()} (graceful local fallback)\n`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n[gateway] ${signal} received, persisting rooms…`);
  clearInterval(heartbeat);
  wss.close();
  server.close();
  await Promise.all(
    Array.from(rooms.values()).map(async (room) => {
      room.connections.forEach((connection) => connection.socket.close());
      await room.persist();
    }),
  );
  await redisBridge.shutdown();
  await prisma.$disconnect();
  process.exit(0);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => {
  console.error("[gateway] unhandled rejection", error);
});
