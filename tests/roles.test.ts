import { describe, expect, it } from "vitest";
import {
  canCommentRole,
  canEditRole,
  canManageRole,
  hasAtLeast,
  isAssignableRole,
  roleLabels,
} from "../src/lib/roles";

describe("role hierarchy", () => {
  it("grants editor capabilities at editor and above", () => {
    expect(canEditRole("OWNER")).toBe(true);
    expect(canEditRole("ADMIN")).toBe(true);
    expect(canEditRole("EDITOR")).toBe(true);
    expect(canEditRole("COMMENTER")).toBe(false);
    expect(canEditRole("VIEWER")).toBe(false);
    expect(canEditRole(null)).toBe(false);
  });

  it("treats commenters as readers with comment access only", () => {
    expect(canCommentRole("COMMENTER")).toBe(true);
    expect(canCommentRole("VIEWER")).toBe(false);
    expect(canEditRole("COMMENTER")).toBe(false);
  });

  it("reserves management for owners and admins", () => {
    expect(canManageRole("OWNER")).toBe(true);
    expect(canManageRole("ADMIN")).toBe(true);
    expect(canManageRole("EDITOR")).toBe(false);
  });

  it("compares roles by rank", () => {
    expect(hasAtLeast("OWNER", "ADMIN")).toBe(true);
    expect(hasAtLeast("EDITOR", "ADMIN")).toBe(false);
    expect(hasAtLeast(undefined, "VIEWER")).toBe(false);
  });

  it("validates assignable roles and labels", () => {
    expect(isAssignableRole("EDITOR")).toBe(true);
    expect(isAssignableRole("SUPERUSER")).toBe(false);
    expect(roleLabels.VIEWER).toBe("Viewer");
  });
});
