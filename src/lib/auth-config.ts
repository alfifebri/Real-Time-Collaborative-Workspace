import { jwtVerify } from "jose";

export const SESSION_COOKIE = "cowork_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  color: string;
  title?: string | null;
};

function secret(): Uint8Array {
  const value =
    process.env.AUTH_SECRET ??
    "cowork-studio-dev-secret-8f2c9b1e7a4d3c6f0a5e8b2d1c7f4a9e";
  return new TextEncoder().encode(value);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      id: payload.sub,
      email: payload.email,
      name: String(payload.name ?? "Teammate"),
      color: String(payload.color ?? "#22D3EE"),
      title: typeof payload.title === "string" ? payload.title : null,
    };
  } catch {
    return null;
  }
}

export function authSecret(): Uint8Array {
  return secret();
}
