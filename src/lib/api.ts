import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { getSession, type SessionUser } from "./auth";

export async function apiSession(): Promise<SessionUser | null> {
  return getSession();
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { data: null, error: jsonError("Invalid JSON body") };
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    return {
      data: null,
      error: jsonError(issue ? `${issue.path.join(".") || "body"}: ${issue.message}` : "Invalid body"),
    };
  }
  return { data: result.data, error: null };
}

export function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

export function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  const buffer = Buffer.from(value, "base64");
  const bytes = new Uint8Array(buffer.byteLength);
  bytes.set(buffer);
  return bytes;
}
