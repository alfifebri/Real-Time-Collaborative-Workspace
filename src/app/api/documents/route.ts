import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { createDocumentSchema } from "@/lib/validators";
import { getWorkspaceMembership } from "@/lib/permissions";
import { canEditRole, type RoleName } from "@/lib/roles";

export async function POST(request: Request) {
  const session = await apiSession();
  if (!session) return jsonError("Sign in to create a page", 401);

  const parsed = await parseJson(request, createDocumentSchema);
  if (parsed.error) return parsed.error;

  const { workspaceId, parentId } = parsed.data;

  const membership = await getWorkspaceMembership(workspaceId, session.id);
  if (!membership || !canEditRole(membership.role as RoleName)) {
    return jsonError("You don't have permission to create pages here", 403);
  }

  if (parentId) {
    const parent = await prisma.document.findUnique({
      where: { id: parentId },
      select: { workspaceId: true },
    });
    if (!parent || parent.workspaceId !== workspaceId) {
      return jsonError("Parent page not found in this workspace", 404);
    }
  }

  const last = await prisma.document.findFirst({
    where: { workspaceId, parentId: parentId ?? null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  const document = await prisma.document.create({
    data: {
      workspaceId,
      parentId: parentId ?? null,
      title: parsed.data.title?.trim() || "Untitled",
      icon: parsed.data.icon ?? "file-text",
      position: (last?.position ?? -1) + 1,
      createdById: session.id,
    },
  });

  return NextResponse.json({ document });
}
