import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { createCommentSchema } from "@/lib/validators";
import { getDocumentAccess } from "@/lib/permissions";
import { groupComments, mapComment } from "@/lib/data";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);

  const comments = await prisma.comment.findMany({
    where: { documentId: id },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ comments: groupComments(comments) });
}

export async function POST(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canComment) return jsonError("You have view-only access", 403);

  const parsed = await parseJson(request, createCommentSchema);
  if (parsed.error) return parsed.error;
  const data = parsed.data;

  if (data.parentId) {
    const parent = await prisma.comment.findUnique({
      where: { id: data.parentId },
      select: { documentId: true, parentId: true },
    });
    if (!parent || parent.documentId !== id) {
      return jsonError("Parent comment not found", 404);
    }
    if (parent.parentId) {
      return jsonError("Replies can only be one level deep", 400);
    }
  }

  const comment = await prisma.comment.create({
    data: {
      documentId: id,
      authorId: session.id,
      body: data.body.trim(),
      quote: data.quote?.trim() ?? "",
      parentId: data.parentId ?? null,
      anchorFrom: data.anchorFrom ?? null,
      anchorTo: data.anchorTo ?? null,
    },
    include: { author: true },
  });

  return NextResponse.json({ comment: mapComment(comment) });
}
