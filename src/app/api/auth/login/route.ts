import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { parseJson, jsonError } from "@/lib/api";
import { loginSchema } from "@/lib/validators";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";

export async function POST(request: Request) {
  const parsed = await parseJson(request, loginSchema);
  if (parsed.error) return parsed.error;

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      workspaceMembers: {
        include: { workspace: { select: { slug: true } } },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) return jsonError("No account found for that email", 401);

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return jsonError("That password doesn't match", 401);

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    color: user.color,
    title: user.title,
  });

  const workspaceSlug = user.workspaceMembers[0]?.workspace.slug ?? null;
  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, color: user.color },
    workspaceSlug,
  });
  response.cookies.set({ ...sessionCookieOptions(), value: token });
  return response;
}
