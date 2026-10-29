import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import {
  canCommentRole,
  canEditRole,
  canManageRole,
  type RoleName,
} from "./roles";

export type DocumentAccess = {
  documentId: string;
  workspaceId: string;
  workspaceSlug: string;
  role: RoleName;
  canRead: boolean;
  canWrite: boolean;
  canComment: boolean;
  canManage: boolean;
};

function asRoleName(role: Role): RoleName {
  return role as RoleName;
}

export async function getDocumentAccess(
  documentId: string,
  userId: string,
): Promise<DocumentAccess | null> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      workspaceId: true,
      workspace: { select: { slug: true } },
    },
  });

  if (!document) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: {
      workspaceId_userId: { workspaceId: document.workspaceId, userId },
    },
    select: { role: true },
  });

  if (!membership) return null;

  const override = await prisma.documentPermission.findUnique({
    where: { documentId_userId: { documentId, userId } },
    select: { role: true },
  });

  let role = asRoleName(membership.role);
  if (override && role !== "OWNER" && role !== "ADMIN") {
    role = asRoleName(override.role);
  }

  return {
    documentId: document.id,
    workspaceId: document.workspaceId,
    workspaceSlug: document.workspace.slug,
    role,
    canRead: true,
    canWrite: canEditRole(role),
    canComment: canCommentRole(role),
    canManage: canManageRole(role),
  };
}

export async function getWorkspaceMembership(workspaceId: string, userId: string) {
  return prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
    select: { role: true },
  });
}
