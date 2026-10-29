import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiSession, jsonError, parseJson } from "@/lib/api";
import { updateWorkspaceMemberSchema } from "@/lib/validators";
import { canManageRole, type RoleName } from "@/lib/roles";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const session = await apiSession();
  if (!session) return jsonError("Unauthorized", 401);

  const { id } = await params;
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    select: { ownerId: true },
  });
  if (!workspace) return jsonError("Workspace not found", 404);

  const requester = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId: session.id } },
    select: { role: true },
  });
  if (!requester || !canManageRole(requester.role as RoleName)) {
    return jsonError("Only owners and admins can manage members", 403);
  }

  const parsed = await parseJson(request, updateWorkspaceMemberSchema);
  if (parsed.error) return parsed.error;
  const { userId, role } = parsed.data;

  if (userId === workspace.ownerId) {
    return jsonError("The workspace owner's role cannot be changed", 400);
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: id, userId } },
  });
  if (!target) return jsonError("That person is not in this workspace", 404);

  await prisma.workspaceMember.update({
    where: { id: target.id },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}
