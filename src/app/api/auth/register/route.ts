import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { jsonError, parseJson } from "@/lib/api";
import { registerSchema } from "@/lib/validators";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { CURSOR_COLORS } from "@/lib/constants";

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name) || "workspace";
  let candidate = base;
  let suffix = 1;
  while (await prisma.workspace.findUnique({ where: { slug: candidate } })) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, registerSchema);
  if (parsed.error) return parsed.error;

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("An account with that email already exists", 409);

  const passwordHash = await bcrypt.hash(password, 11);
  const slug = await uniqueSlug(`${name.split(" ")[0]}'s studio`);
  const color = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      color,
      title: "Workspace member",
    },
  });

  const workspace = await prisma.workspace.create({
    data: {
      name: `${name.split(" ")[0]}'s studio`,
      slug,
      icon: "layers",
      accent: color,
      ownerId: user.id,
      members: { create: { userId: user.id, role: "OWNER" } },
      documents: {
        create: {
          title: "Welcome to your studio",
          icon: "file-text",
          createdById: user.id,
          position: 0,
          isFavorite: true,
        },
      },
    },
  });

  const token = await createSessionToken({
    id: user.id,
    email: user.email,
    name: user.name,
    color: user.color,
    title: user.title,
  });

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email, color: user.color },
    workspaceSlug: workspace.slug,
  });
  response.cookies.set({ ...sessionCookieOptions(), value: token });
  return response;
}
