import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError } from "@/lib/api";
import { getDocumentAccess } from "@/lib/permissions";

type Params = { params: Promise<{ id: string; versionId: string }> };

export async function POST(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id, versionId } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canWrite) return jsonError("You have view-only access", 403);

  const version = await prisma.version.findFirst({
    where: { id: versionId, documentId: id },
  });
  if (!version) return jsonError("Version not found", 404);

  const restored = await prisma.$transaction(async (tx) => {
    return tx.version.create({
      data: {
        documentId: id,
        createdById: session.id,
        label: `Restored · ${version.label}`,
        kind: "MANUAL",
        content:
          version.content === null
            ? Prisma.JsonNull
            : (version.content as Prisma.InputJsonValue),
        ydocState: version.ydocState,
      },
    });
  });

  return NextResponse.json({
    content: version.content,
    label: restored.label,
    versionId: restored.id,
  });
}
