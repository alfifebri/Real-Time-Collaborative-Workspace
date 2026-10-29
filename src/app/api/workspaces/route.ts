import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { createWorkspaceSchema } from "@/lib/validators";
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
  const session = await apiSession();
  if (!session) return jsonError("Sign in to create a workspace", 401);

  const parsed = await parseJson(request, createWorkspaceSchema);
  if (parsed.error) return parsed.error;

  const slug = await uniqueSlug(parsed.data.name);
  const accent = CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];

  const workspace = await prisma.workspace.create({
    data: {
      name: parsed.data.name,
      slug,
      icon: parsed.data.icon ?? "layers",
      accent,
      ownerId: session.id,
      members: { create: { userId: session.id, role: "OWNER" } },
      documents: {
        create: {
          title: "Getting started",
          icon: "compass",
          createdById: session.id,
          position: 0,
        },
      },
    },
  });

  return NextResponse.json({ workspace: { id: workspace.id, slug: workspace.slug } });
}
