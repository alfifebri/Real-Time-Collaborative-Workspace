import Redis, { type RedisOptions } from "ioredis";

export type BusMessage = {
  kind: "update" | "awareness";
  payload: string;
};

type Handler = (message: BusMessage) => void;

const CHANNEL_PREFIX = "cowork:doc:";
const STREAM_PREFIX = "cowork:updates:";
const STREAM_MAX_LENGTH = 10_000;

function channelFor(docId: string) {
  return `${CHANNEL_PREFIX}${docId}`;
}

function streamFor(docId: string) {
  return `${STREAM_PREFIX}${docId}`;
}

class RedisBridge {
  private publisher: Redis;
  private subscriber: Redis;
  private handlers = new Map<string, Handler>();
  private readyPromise: Promise<void>;
  public available = false;

  constructor() {
    const url = process.env.REDIS_URL ?? "redis://localhost:6379";
    const isTls = url.startsWith("rediss://");
    const options: RedisOptions = {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
      connectTimeout: 5000,
      keepAlive: 10_000,
      ...(isTls ? { tls: {} } : {}),
    };

    this.publisher = new Redis(url, options);
    this.subscriber = new Redis(url, options);
    this.publisher.on("error", () => {});
    this.subscriber.on("error", () => {});
    this.subscriber.on("message", (channel, raw) => {
      const docId = channel.startsWith(CHANNEL_PREFIX)
        ? channel.slice(CHANNEL_PREFIX.length)
        : null;
      if (!docId) return;
      const handler = this.handlers.get(docId);
      if (!handler) return;
      try {
        const parsed = JSON.parse(raw) as BusMessage;
        if (parsed.kind === "update" || parsed.kind === "awareness") {
          handler(parsed);
        }
      } catch {
        // Ignore malformed bus messages.
      }
    });

    this.readyPromise = this.connect();
  }

  private async connect(): Promise<void> {
    try {
      await Promise.all([this.publisher.connect(), this.subscriber.connect()]);
      await this.publisher.ping();
      this.available = true;
      console.log("[redis] pub/sub bridge connected");
    } catch (error) {
      this.available = false;
      this.publisher.disconnect();
      this.subscriber.disconnect();
      const message = error instanceof Error ? error.message : String(error);
      console.warn(
        `[redis] unavailable (${message}). Running in single-node mode; document updates persist to Postgres.`,
      );
    }
  }

  async ready(): Promise<void> {
    await this.readyPromise;
  }

  async subscribe(docId: string, handler: Handler): Promise<void> {
    await this.ready();
    if (!this.available) return;
    this.handlers.set(docId, handler);
    try {
      await this.subscriber.subscribe(channelFor(docId));
    } catch (error) {
      console.warn("[redis] subscribe failed", error);
    }
  }

  async unsubscribe(docId: string): Promise<void> {
    this.handlers.delete(docId);
    if (!this.available) return;
    try {
      await this.subscriber.unsubscribe(channelFor(docId));
    } catch {
      // noop
    }
  }

  async appendUpdate(docId: string, payload: string): Promise<void> {
    await this.ready();
    if (!this.available) return;
    try {
      await this.publisher.xadd(
        streamFor(docId),
        "MAXLEN",
        "~",
        String(STREAM_MAX_LENGTH),
        "*",
        "u",
        payload,
      );
      await this.publisher.publish(
        channelFor(docId),
        JSON.stringify({ kind: "update", payload } satisfies BusMessage),
      );
    } catch (error) {
      console.warn("[redis] append failed", error);
    }
  }

  async publishAwareness(docId: string, payload: string): Promise<void> {
    await this.ready();
    if (!this.available) return;
    try {
      await this.publisher.publish(
        channelFor(docId),
        JSON.stringify({ kind: "awareness", payload } satisfies BusMessage),
      );
    } catch (error) {
      console.warn("[redis] awareness publish failed", error);
    }
  }

  async readUpdates(docId: string): Promise<Uint8Array[]> {
    await this.ready();
    if (!this.available) return [];
    try {
      const rows = (await this.publisher.xrange(streamFor(docId), "-", "+")) as [
        string,
        string[],
      ][];
      const updates: Uint8Array[] = [];
      for (const [, fields] of rows) {
        const index = fields.indexOf("u");
        if (index === -1) continue;
        const value = fields[index + 1];
        if (!value) continue;
        updates.push(new Uint8Array(Buffer.from(value, "base64")));
      }
      return updates;
    } catch (error) {
      console.warn("[redis] stream read failed", error);
      return [];
    }
  }

  async shutdown(): Promise<void> {
    try {
      this.publisher.disconnect();
      this.subscriber.disconnect();
    } catch {
      // noop
    }
  }
}

export const redisBridge = new RedisBridge();
