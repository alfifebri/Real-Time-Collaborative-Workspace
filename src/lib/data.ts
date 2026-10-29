import type { Role } from "@prisma/client";
import { prisma } from "./prisma";
import { getDocumentAccess } from "./permissions";
import type { RoleName } from "./roles";
import type {
  Breadcrumb,
  CommentDTO,
  CommentThreadDTO,
  DocumentPageData,
  DocumentSummary,
  MemberSummary,
  UserSummary,
  VersionSummary,
  WorkspaceContext,
  WorkspaceSummary,
} from "./types";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  color: string;
  title: string | null;
};

type CommentRecord = {
  id: string;
  body: string;
  quote: string;
  resolved: boolean;
  parentId: string | null;
  anchorFrom: number | null;
  anchorTo: number | null;
  createdAt: Date;
  author: UserRecord;
};

export function mapUser(user: UserRecord): UserSummary {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    color: user.color,
    title: user.title,
  };
}

export function mapComment(comment: CommentRecord): CommentDTO {
  return {
    id: comment.id,
    body: comment.body,
    quote: comment.quote,
    resolved: comment.resolved,
    parentId: comment.parentId,
    anchorFrom: comment.anchorFrom,
    anchorTo: comment.anchorTo,
    createdAt: comment.createdAt.toISOString(),
    author: mapUser(comment.author),
  };
}

export function groupComments(comments: CommentRecord[]): CommentThreadDTO[] {
  const roots = comments
    .filter((comment) => !comment.parentId)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return roots.map((root) => ({
    ...mapComment(root),
    replies: comments
      .filter((comment) => comment.parentId === root.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(mapComment),
  }));
}

function mapDocument(document: {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  position: number;
  isFavorite: boolean;
  updatedAt: Date;
  createdAt: Date;
}): DocumentSummary {
  return {
    id: document.id,
    parentId: document.parentId,
    title: document.title,
    icon: document.icon,
    position: document.position,
    isFavorite: document.isFavorite,
    updatedAt: document.updatedAt.toISOString(),
    createdAt: document.createdAt.toISOString(),
  };
}

function mapWorkspaceSummary(workspace: {
  id: string;
  name: string;
  slug: string;
  icon: string;
  accent: string;
  members: { role: Role }[];
}): WorkspaceSummary {
  return {
    id: workspace.id,
    name: workspace.name,
    slug: workspace.slug,
    icon: workspace.icon,
    accent: workspace.accent,
    role: (workspace.members[0]?.role ?? "VIEWER") as RoleName,
  };
}

export async function getWorkspaceContext(
  slug: string,
  userId: string,
): Promise<WorkspaceContext | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!workspace) return null;

  const currentMembership = workspace.members.find((member) => member.userId === userId);
  if (!currentMembership) return null;

  const [documents, workspaceRows] = await Promise.all([
    prisma.document.findMany({
      where: { workspaceId: workspace.id },
      select: {
        id: true,
        parentId: true,
        title: true,
        icon: true,
        position: true,
        isFavorite: true,
        updatedAt: true,
        createdAt: true,
      },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    }),
    prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        accent: true,
        members: { where: { userId }, select: { role: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const members: MemberSummary[] = workspace.members.map((member) => ({
    ...mapUser(member.user),
    role: member.role as RoleName,
    membershipRole: member.role as RoleName,
    hasOverride: false,
  }));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.icon,
      accent: workspace.accent,
      ownerId: workspace.ownerId,
      createdAt: workspace.createdAt.toISOString(),
    },
    role: currentMembership.role as RoleName,
    documents: documents.map(mapDocument),
    workspaces: workspaceRows.map(mapWorkspaceSummary),
    members,
  };
}

async function getBreadcrumbs(documentId: string, parentId: string | null): Promise<Breadcrumb[]> {
  const crumbs: Breadcrumb[] = [];
  let currentParent = parentId;
  let guard = 0;

  while (currentParent && guard < 8) {
    const parent = await prisma.document.findUnique({
      where: { id: currentParent },
      select: { id: true, title: true, icon: true, parentId: true },
    });
    if (!parent) break;
    crumbs.unshift({ id: parent.id, title: parent.title, icon: parent.icon });
    currentParent = parent.parentId;
    guard += 1;
  }

  return crumbs;
}

export async function getDocumentPageData(
  workspaceSlug: string,
  documentId: string,
  userId: string,
): Promise<DocumentPageData | null> {
  const access = await getDocumentAccess(documentId, userId);
  if (!access || access.workspaceSlug !== workspaceSlug) return null;

  const [workspace, document, comments, versions] = await Promise.all([
    prisma.workspace.findUnique({
      where: { id: access.workspaceId },
      select: {
        id: true,
        name: true,
        slug: true,
        icon: true,
        accent: true,
        members: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.document.findUnique({
      where: { id: documentId },
      include: { createdBy: true },
    }),
    prisma.comment.findMany({
      where: { documentId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.version.findMany({
      where: { documentId },
      include: { createdBy: { select: { id: true, name: true, color: true } } },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);

  if (!workspace || !document) return null;

  const overrides = await prisma.documentPermission.findMany({
    where: { documentId },
    select: { userId: true, role: true },
  });
  const overrideMap = new Map(overrides.map((override) => [override.userId, override.role]));

  const members: MemberSummary[] = workspace.members.map((member) => {
    const override = overrideMap.get(member.userId);
    const membershipRole = member.role as RoleName;
    const isAdmin = membershipRole === "OWNER" || membershipRole === "ADMIN";
    const effectiveRole = (override && !isAdmin ? override : member.role) as RoleName;

    return {
      ...mapUser(member.user),
      role: effectiveRole,
      membershipRole,
      hasOverride: Boolean(override) && !isAdmin,
    };
  });

  const breadcrumbs = await getBreadcrumbs(document.id, document.parentId);

  const versionSummaries: VersionSummary[] = versions.map((version) => ({
    id: version.id,
    label: version.label,
    kind: version.kind,
    createdAt: version.createdAt.toISOString(),
    author: version.createdBy
      ? {
          id: version.createdBy.id,
          name: version.createdBy.name,
          color: version.createdBy.color,
        }
      : null,
  }));

  return {
    workspace: {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      icon: workspace.icon,
      accent: workspace.accent,
    },
    document: {
      ...mapDocument(document),
      createdById: document.createdById,
      creatorName: document.createdBy.name,
    },
    role: access.role,
    canEdit: access.canWrite,
    canComment: access.canComment,
    canManage: access.canManage,
    comments: groupComments(comments),
    versions: versionSummaries,
    breadcrumbs,
    members,
  };
}
