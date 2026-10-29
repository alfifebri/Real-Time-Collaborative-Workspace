import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, base64ToBytes, jsonError, parseJson } from "@/lib/api";
import { createVersionSchema } from "@/lib/validators";
import { getDocumentAccess } from "@/lib/permissions";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);

  const versions = await prisma.version.findMany({
    where: { documentId: id },
    select: {
      id: true,
      label: true,
      kind: true,
      createdAt: true,
      createdBy: { select: { id: true, name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    versions: versions.map((version) => ({
      id: version.id,
      label: version.label,
      kind: version.kind,
      createdAt: version.createdAt.toISOString(),
      author: version.createdBy,
    })),
  });
}

export async function POST(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canWrite) return jsonError("You have view-only access", 403);

  const parsed = await parseJson(request, createVersionSchema);
  if (parsed.error) return parsed.error;

  const kind = parsed.data.kind ?? "MANUAL";
  let ydocState: Uint8Array<ArrayBuffer> | null = null;
  if (parsed.data.ydocState) {
    try {
      ydocState = base64ToBytes(parsed.data.ydocState);
    } catch {
      return jsonError("Invalid Yjs snapshot");
    }
  }

  const version = await prisma.version.create({
    data: {
      documentId: id,
      createdById: session.id,
      label:
        parsed.data.label?.trim() ||
        (kind === "AUTO" ? "Automatic snapshot" : "Manual snapshot"),
      kind,
      content: parsed.data.content,
      ydocState,
    },
  });

  if (kind === "AUTO") {
    const autos = await prisma.version.findMany({
      where: { documentId: id, kind: "AUTO" },
      orderBy: { createdAt: "desc" },
      select: { id: true },
      skip: 30,
    });
    if (autos.length) {
      await prisma.version.deleteMany({
        where: { id: { in: autos.map((version) => version.id) } },
      });
    }
  }

  return NextResponse.json({
    version: {
      id: version.id,
      label: version.label,
      kind: version.kind,
      createdAt: version.createdAt.toISOString(),
    },
  });
}
