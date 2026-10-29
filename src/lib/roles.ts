export type RoleName = "OWNER" | "ADMIN" | "EDITOR" | "COMMENTER" | "VIEWER";

const rank: Record<RoleName, number> = {
  OWNER: 5,
  ADMIN: 4,
  EDITOR: 3,
  COMMENTER: 2,
  VIEWER: 1,
};

export const roleLabels: Record<RoleName, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Editor",
  COMMENTER: "Commenter",
  VIEWER: "Viewer",
};

export const roleDescriptions: Record<RoleName, string> = {
  OWNER: "Full access, billing and workspace settings",
  ADMIN: "Manage members, sharing and content",
  EDITOR: "Create and edit documents",
  COMMENTER: "Read and leave comments",
  VIEWER: "Read-only access",
};

export function hasAtLeast(role: RoleName | null | undefined, minimum: RoleName): boolean {
  if (!role) return false;
  return rank[role] >= rank[minimum];
}

export function canEditRole(role: RoleName | null | undefined): boolean {
  return hasAtLeast(role, "EDITOR");
}

export function canCommentRole(role: RoleName | null | undefined): boolean {
  return hasAtLeast(role, "COMMENTER");
}

export function canManageRole(role: RoleName | null | undefined): boolean {
  return hasAtLeast(role, "ADMIN");
}

export function isAssignableRole(role: string): role is RoleName {
  return Object.prototype.hasOwnProperty.call(rank, role);
}

export function assignableRoles(): RoleName[] {
  return ["ADMIN", "EDITOR", "COMMENTER", "VIEWER"];
}
