import type { RoleName } from "./roles";

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  color: string;
  title: string | null;
};

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  icon: string;
  accent: string;
  role: RoleName;
};

export type DocumentSummary = {
  id: string;
  parentId: string | null;
  title: string;
  icon: string;
  position: number;
  isFavorite: boolean;
  updatedAt: string;
  createdAt: string;
};

export type MemberSummary = UserSummary & {
  role: RoleName;
  membershipRole: RoleName;
  hasOverride: boolean;
};

export type CommentDTO = {
  id: string;
  body: string;
  quote: string;
  resolved: boolean;
  parentId: string | null;
  anchorFrom: number | null;
  anchorTo: number | null;
  createdAt: string;
  author: UserSummary;
};

export type CommentThreadDTO = CommentDTO & {
  replies: CommentDTO[];
};

export type VersionSummary = {
  id: string;
  label: string;
  kind: "MANUAL" | "AUTO";
  createdAt: string;
  author: { id: string; name: string; color: string } | null;
};

export type Breadcrumb = {
  id: string;
  title: string;
  icon: string;
};

export type WorkspaceContext = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    accent: string;
    ownerId: string;
    createdAt: string;
  };
  role: RoleName;
  documents: DocumentSummary[];
  workspaces: WorkspaceSummary[];
  members: MemberSummary[];
};

export type DocumentPageData = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    accent: string;
  };
  document: DocumentSummary & {
    createdById: string;
    creatorName: string;
  };
  role: RoleName;
  canEdit: boolean;
  canComment: boolean;
  canManage: boolean;
  comments: CommentThreadDTO[];
  versions: VersionSummary[];
  breadcrumbs: Breadcrumb[];
  members: MemberSummary[];
};

export type EditorUser = {
  id: string;
  name: string;
  color: string;
  title: string | null;
};
