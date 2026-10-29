import { SignJWT, jwtVerify } from "jose";
import { authSecret, type SessionUser } from "./auth-config";

export type RealtimeIdentity = {
  id: string;
  name: string;
  color: string;
  title: string | null;
};

export async function createRealtimeToken(
  user: SessionUser,
  documentId: string,
): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    color: user.color,
    title: user.title ?? null,
    docId: documentId,
    scope: "realtime",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("2h")
    .sign(authSecret());
}

export async function verifyRealtimeToken(
  token: string,
  documentId: string,
): Promise<RealtimeIdentity | null> {
  try {
    const { payload } = await jwtVerify(token, authSecret(), { algorithms: ["HS256"] });
    if (payload.scope !== "realtime" || payload.docId !== documentId) return null;
    if (!payload.sub) return null;
    return {
      id: payload.sub,
      name: String(payload.name ?? "Teammate"),
      color: String(payload.color ?? "#22D3EE"),
      title: typeof payload.title === "string" ? payload.title : null,
    };
  } catch {
    return null;
  }
}
