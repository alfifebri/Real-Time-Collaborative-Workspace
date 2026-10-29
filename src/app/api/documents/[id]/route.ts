import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { updateDocumentSchema } from "@/lib/validators";
import { getDocumentAccess } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

async function isDescendant(documentId: string, possibleParentId: string): Promise<boolean> {
  let cursor: string | null = possibleParentId;
  let guard = 0;
  while (cursor && guard < 20) {
    if (cursor === documentId) return true;
    const parent: { parentId: string | null } | null = await prisma.document.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
    guard += 1;
  }
  return false;
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canWrite) return jsonError("You don't have edit access", 403);

  const parsed = await parseJson(request, updateDocumentSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  if (data.parentId !== undefined && data.parentId !== null) {
    if (data.parentId === id) return jsonError("A page cannot be its own parent");
    const parent = await prisma.document.findUnique({
      where: { id: data.parentId },
      select: { workspaceId: true },
    });
    if (!parent || parent.workspaceId !== access.workspaceId) {
      return jsonError("Parent page not found in this workspace", 404);
    }
    if (await isDescendant(id, data.parentId)) {
      return jsonError("Cannot move a page inside one of its children", 400);
    }
  }

  const document = await prisma.document.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() || "Untitled" } : {}),
      ...(data.icon !== undefined ? { icon: data.icon } : {}),
      ...(data.isFavorite !== undefined ? { isFavorite: data.isFavorite } : {}),
      ...(data.parentId !== undefined ? { parentId: data.parentId } : {}),
    },
    select: {
      id: true,
      title: true,
      icon: true,
      isFavorite: true,
      parentId: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ document });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canWrite) return jsonError("You don't have edit access", 403);

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
