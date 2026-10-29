"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Globe2, Link2, Loader2, ShieldCheck, Users } from "lucide-react";
import { toast } from "sonner";
import type { RoleName } from "@/lib/roles";
import { roleDescriptions, roleLabels } from "@/lib/roles";
import { cn, initials } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

type ShareMember = {
  id: string;
  name: string;
  email: string;
  color: string;
  title: string | null;
  role: RoleName;
  membershipRole: RoleName;
  hasOverride: boolean;
  isOwner: boolean;
};

type ShareModalProps = {
  open: boolean;
  onClose: () => void;
  documentId: string;
  workspaceId: string;
  workspaceName: string;
  canManage: boolean;
};

const documentRoles: { value: "inherit" | "EDITOR" | "COMMENTER" | "VIEWER"; label: string }[] = [
  { value: "inherit", label: "Inherit workspace" },
  { value: "EDITOR", label: "Editor" },
  { value: "COMMENTER", label: "Commenter" },
  { value: "VIEWER", label: "Viewer" },
];

const workspaceRoles: { value: RoleName; label: string }[] = [
  { value: "ADMIN", label: "Admin" },
  { value: "EDITOR", label: "Editor" },
  { value: "COMMENTER", label: "Commenter" },
  { value: "VIEWER", label: "Viewer" },
];

export function ShareModal({
  open,
  onClose,
  documentId,
  workspaceId,
  workspaceName,
  canManage,
}: ShareModalProps) {
  const [members, setMembers] = useState<ShareMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"page" | "workspace">("page");
  const [updating, setUpdating] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/members`);
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not load members");
      setMembers(payload.members as ShareMember[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void load();
      setTab("page");
      setCopied(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, documentId]);

  const updatePageRole = async (member: ShareMember, value: string) => {
    if (!canManage || updating) return;
    setUpdating(member.id);
    try {
      const response = await fetch(`/api/documents/${documentId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: member.id,
          role: value === "inherit" ? null : value,
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not update access");
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                role: (value === "inherit" ? item.membershipRole : value) as RoleName,
                hasOverride: value !== "inherit",
              }
            : item,
        ),
      );
      toast.success("Page access updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update access");
    } finally {
      setUpdating(null);
    }
  };

  const updateWorkspaceRole = async (member: ShareMember, value: RoleName) => {
    if (!canManage || updating) return;
    setUpdating(member.id);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, role: value }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "Could not update workspace role");
      setMembers((current) =>
        current.map((item) =>
          item.id === member.id
            ? {
                ...item,
                membershipRole: value,
                role: item.hasOverride ? item.role : value,
              }
            : item,
        ),
      );
      toast.success("Workspace role updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update workspace role");
    } finally {
      setUpdating(null);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      toast.success("Page link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy the link");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share this page"
      description={`Everyone in ${workspaceName} can access it based on their role.`}
      className="max-w-xl"
    >
      <div className="px-5 pb-5 pt-4">
        <div className="flex gap-1 rounded-lg border border-line bg-tint-2 p-1">
          {(
            [
              { id: "page", label: "Page access", icon: ShieldCheck },
              { id: "workspace", label: "Workspace", icon: Users },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-[10px] font-medium transition-colors",
                  tab === item.id
                    ? "bg-tint-4 text-ink shadow-soft-inset"
                    : "text-ink-faint hover:text-ink-muted",
                )}
              >
                <Icon size={11} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-line bg-tint-2 px-3 py-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-tint-2 text-ink-faint">
            <Link2 size={13} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium text-ink">Any member with access</p>
            <p className="truncate text-[9px] text-ink-faint">{origin || "https://cowork.studio"}/w/…</p>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex h-7 shrink-0 items-center gap-1 rounded-md border border-line bg-tint-2 px-2.5 text-[9.5px] font-medium text-ink-muted transition-colors hover:border-line-bright hover:text-ink"
          >
            {copied ? <Check size={10} className="text-neon-emerald" /> : <Copy size={10} />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-between px-0.5">
          <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {tab === "page" ? "People with access" : "Workspace roles"}
          </p>
          <span className="text-[9px] text-ink-faint">{members.length} people</span>
        </div>

        <div className="mt-2 max-h-[300px] space-y-1 overflow-y-auto pr-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-ink-faint" />
            </div>
          ) : (
            members.map((member) => {
              const locked = member.isOwner || member.membershipRole === "ADMIN";
              const value =
                tab === "page"
                  ? member.hasOverride
                    ? member.role
                    : "inherit"
                  : member.membershipRole;

              return (
                <div
                  key={member.id}
                  className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-tint-3"
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-[#0b0d10]"
                    style={{ backgroundColor: member.color }}
                  >
                    {initials(member.name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-ink">
                      {member.name}
                      {member.isOwner && (
                        <span className="ml-1.5 rounded border border-neon-amber/20 bg-neon-amber/[0.06] px-1 py-px text-[7px] font-semibold uppercase tracking-wide text-neon-amber">
                          Owner
                        </span>
                      )}
                    </p>
                    <p className="truncate text-[9px] text-ink-faint">{member.email}</p>
                  </div>
                  {updating === member.id ? (
                    <Loader2 size={13} className="animate-spin text-ink-faint" />
                  ) : (
                    <select
                      value={value}
                      disabled={!canManage || locked}
                      onChange={(event) => {
                        if (tab === "page") void updatePageRole(member, event.target.value);
                        else void updateWorkspaceRole(member, event.target.value as RoleName);
                      }}
                      className="h-7 max-w-[128px] rounded-md border border-line bg-tint-2 px-1.5 text-[9.5px] text-ink-muted outline-none transition-colors hover:border-line-bright disabled:cursor-not-allowed disabled:opacity-60"
                      title={roleDescriptions[member.role]}
                    >
                      {tab === "page" ? (
                        <>
                          {documentRoles.map((role) => (
                            <option key={role.value} value={role.value}>
                              {role.value === "inherit"
                                ? `Inherit · ${roleLabels[member.membershipRole]}`
                                : role.label}
                            </option>
                          ))}
                          {locked && <option value={member.membershipRole}>{roleLabels[member.membershipRole]}</option>}
                        </>
                      ) : (
                        <>
                          {member.isOwner ? (
                            <option value="OWNER">Owner</option>
                          ) : (
                            workspaceRoles.map((role) => (
                              <option key={role.value} value={role.value}>
                                {role.label}
                              </option>
                            ))
                          )}
                        </>
                      )}
                    </select>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-tint-1 px-3 py-2.5 text-[9px] leading-relaxed text-ink-faint">
          <Globe2 size={11} className="mt-0.5 shrink-0" />
          {canManage
            ? "Page access overrides workspace defaults. Owners and admins always keep full access."
            : "Only workspace owners and admins can change sharing. Ask an admin if you need access."}
        </div>
      </div>
    </Modal>
  );
}
