import "server-only";

import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  authSecret,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  verifySessionToken,
  type SessionUser,
} from "./auth-config";

export type { SessionUser };

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    color: user.color,
    title: user.title ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(authSecret());
}

export async function createSessionCookie(user: SessionUser): Promise<string> {
  return createSessionToken(user);
}

export function sessionCookieOptions() {
  return {
    name: SESSION_COOKIE,
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
