import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError } from "@/lib/api";
import { getDocumentAccess } from "@/lib/permissions";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id, versionId } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);

  const version = await prisma.version.findFirst({
    where: { id: versionId, documentId: id },
    include: { createdBy: { select: { id: true, name: true, color: true } } },
  });
  if (!version) return jsonError("Version not found", 404);

  return NextResponse.json({
    version: {
      id: version.id,
      label: version.label,
      kind: version.kind,
      createdAt: version.createdAt.toISOString(),
      content: version.content,
      author: version.createdBy,
    },
  });
}
