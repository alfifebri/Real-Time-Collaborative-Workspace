import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { updateDocumentMemberSchema } from "@/lib/validators";
import { getDocumentAccess } from "@/lib/permissions";
import type { RoleName } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);

  const [members, overrides] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: access.workspaceId },
      include: { user: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.documentPermission.findMany({
      where: { documentId: id },
      select: { userId: true, role: true },
    }),
  ]);

  const overrideMap = new Map(overrides.map((override) => [override.userId, override.role]));

  return NextResponse.json({
    members: members.map((member) => {
      const override = overrideMap.get(member.userId);
      const isAdmin = member.role === "OWNER" || member.role === "ADMIN";
      return {
        id: member.user.id,
        name: member.user.name,
        email: member.user.email,
        color: member.user.color,
        title: member.user.title,
        role: (override && !isAdmin ? override : member.role) as RoleName,
        membershipRole: member.role as RoleName,
        hasOverride: Boolean(override) && !isAdmin,
        isOwner: member.role === "OWNER",
      };
    }),
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const access = await getDocumentAccess(id, session.id);
  if (!access) return jsonError("Page not found", 404);
  if (!access.canManage) {
    return jsonError("Only owners and admins can change sharing", 403);
  }

  const parsed = await parseJson(request, updateDocumentMemberSchema);
  if (parsed.error) return parsed.error;
  const { userId, role } = parsed.data;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: access.workspaceId, userId } },
  });
  if (!membership) return jsonError("That person is not in this workspace", 404);
  if (membership.role === "OWNER" || membership.role === "ADMIN") {
    return jsonError("Owners and admins always keep full access", 400);
  }

  if (role === null) {
    await prisma.documentPermission.deleteMany({ where: { documentId: id, userId } });
  } else {
    await prisma.documentPermission.upsert({
      where: { documentId_userId: { documentId: id, userId } },
      update: { role },
      create: { documentId: id, userId, role },
    });
  }

  return NextResponse.json({ ok: true });
}
