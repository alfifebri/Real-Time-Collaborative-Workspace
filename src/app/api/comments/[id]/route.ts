import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { updateCommentSchema } from "@/lib/validators";
import { getDocumentAccess } from "@/lib/permissions";
import { mapComment } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return jsonError("Comment not found", 404);

  const access = await getDocumentAccess(comment.documentId, session.id);
  if (!access) return jsonError("Comment not found", 404);

  const parsed = await parseJson(request, updateCommentSchema);
  if (parsed.error) return parsed.error;

  if (parsed.data.body !== undefined && comment.authorId !== session.id && !access.canManage) {
    return jsonError("You can only edit your own comments", 403);
  }
  if (!access.canComment) return jsonError("You have view-only access", 403);

  const updated = await prisma.comment.update({
    where: { id },
    data: {
      ...(parsed.data.resolved !== undefined ? { resolved: parsed.data.resolved } : {}),
      ...(parsed.data.body !== undefined ? { body: parsed.data.body.trim() } : {}),
    },
    include: { author: true },
  });

  return NextResponse.json({ comment: mapComment(updated) });
}

export async function DELETE(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const comment = await prisma.comment.findUnique({ where: { id } });
  if (!comment) return jsonError("Comment not found", 404);

  const access = await getDocumentAccess(comment.documentId, session.id);
  if (!access) return jsonError("Comment not found", 404);
  if (comment.authorId !== session.id && !access.canManage) {
    return jsonError("You can only delete your own comments", 403);
  }

  await prisma.comment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
