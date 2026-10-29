import { describe, expect, it } from "vitest";
import { SignJWT } from "jose";
import {
  createRealtimeToken,
  verifyRealtimeToken,
} from "../src/lib/realtime-token";
import { authSecret, type SessionUser } from "../src/lib/auth-config";

const user: SessionUser = {
  id: "user_123",
  email: "ava@collabspace.dev",
  name: "Ava Chen",
  color: "#22D3EE",
  title: "Product Lead",
};

describe("realtime tokens", () => {
  it("issues a scoped token that verifies for the same document", async () => {
    const token = await createRealtimeToken(user, "doc_123");
    const identity = await verifyRealtimeToken(token, "doc_123");

    expect(identity).toMatchObject({
      id: "user_123",
      name: "Ava Chen",
      color: "#22D3EE",
      title: "Product Lead",
    });
  });

  it("rejects a token replayed against another document", async () => {
    const token = await createRealtimeToken(user, "doc_123");
    await expect(verifyRealtimeToken(token, "doc_456")).resolves.toBeNull();
  });

  it("rejects tampered tokens", async () => {
    const token = await createRealtimeToken(user, "doc_123");
    const [header, payload] = token.split(".");
    await expect(
      verifyRealtimeToken(`${header}.${payload}.invalid-signature`, "doc_123"),
    ).resolves.toBeNull();
  });

  it("rejects session tokens because they lack the realtime scope", async () => {
    const sessionToken = await new SignJWT({
      email: user.email,
      name: user.name,
      color: user.color,
      docId: "doc_123",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(authSecret());

    await expect(verifyRealtimeToken(sessionToken, "doc_123")).resolves.toBeNull();
    await expect(verifyRealtimeToken("not-a-jwt", "doc_123")).resolves.toBeNull();
  });
});
