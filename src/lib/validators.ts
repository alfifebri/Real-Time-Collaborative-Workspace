import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name is too short").max(60),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, "Workspace name is too short").max(60),
  icon: z.string().max(32).optional(),
});

export const createDocumentSchema = z.object({
  workspaceId: z.string().min(1),
  parentId: z.string().nullable().optional(),
  title: z.string().max(200).optional(),
  icon: z.string().max(32).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  icon: z.string().max(32).optional(),
  isFavorite: z.boolean().optional(),
  parentId: z.string().nullable().optional(),
});

export const createCommentSchema = z.object({
  body: z.string().min(1, "Write something first").max(4000),
  quote: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
  anchorFrom: z.number().int().nonnegative().nullable().optional(),
  anchorTo: z.number().int().nonnegative().nullable().optional(),
  resolved: z.boolean().optional(),
});

export const updateCommentSchema = z.object({
  resolved: z.boolean().optional(),
  body: z.string().min(1).max(4000).optional(),
});

export const createVersionSchema = z.object({
  label: z.string().max(120).optional(),
  kind: z.enum(["MANUAL", "AUTO"]).optional(),
  content: z.any(),
  ydocState: z.string().optional(),
});

export const updateWorkspaceMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["ADMIN", "EDITOR", "COMMENTER", "VIEWER", "OWNER"]),
});

export const updateDocumentMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["EDITOR", "COMMENTER", "VIEWER"]).nullable(),
});
