import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowUpRight,
  Clock3,
  FileText,
  Home,
  Layers,
  Pin,
  Users,
} from "lucide-react";
import { requireSession } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/data";
import { relativeTime } from "@/lib/utils";
import { roleLabels } from "@/lib/roles";
import { Avatar } from "@/components/ui/avatar";
import { IconGlyph } from "@/components/ui/icon-glyph";
import { HomeHeader } from "@/components/workspace/home-header";
import { NewPageButton, SearchPagesButton } from "@/components/workspace/home-actions";
import { RealtimeStatus } from "@/components/workspace/realtime-status";

export const metadata: Metadata = { title: "Workspace" };

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;
  const context = await getWorkspaceContext(slug, session.id);
  if (!context) notFound();

  const favorites = context.documents.filter((document) => document.isFavorite);
  const recents = [...context.documents]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 7);
  const lastEdited = recents[0]?.updatedAt;
  const nextPage = recents[0];

  return (
    <div className="min-h-dvh">
      <HomeHeader
        workspaceName={context.workspace.name}
        workspaceId={context.workspace.id}
        workspaceSlug={context.workspace.slug}
        role={context.role}
        members={context.members}
      />

      <div className="mx-auto max-w-[1240px] px-5 py-8 sm:px-8 lg:py-10">
        <section className="animate-fade-up rounded-3xl border border-line/70 bg-gradient-to-b from-tint-1 to-transparent px-5 py-6 sm:px-7">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-line shadow-soft-inset"
                  style={{
                    background: `linear-gradient(145deg, ${context.workspace.accent}18, transparent 75%)`,
                    color: context.workspace.accent,
                  }}
                >
                  <IconGlyph name={context.workspace.icon} size={15} />
                </span>
                <p className="eyebrow">Workspace</p>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2.5">
                <h1 className="font-sans text-[2rem] font-medium tracking-[-0.045em] text-ink sm:text-[2.35rem]">
                  {context.workspace.name}
                </h1>
                <span className="soft-pill">{roleLabels[context.role]}</span>
                <span className="soft-pill">
                  <span className="live-dot scale-75" /> Live
                </span>
              </div>

              <p className="mt-2.5 max-w-[560px] text-[12.5px] leading-6 text-ink-muted">
                A shared space for the thinking that moves the work forward. Write in
                real time, leave comments where they matter, and keep every version in
                reach.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <SearchPagesButton className="h-9 w-auto px-3 text-[11.5px]" />
              <NewPageButton
                workspaceId={context.workspace.id}
                workspaceSlug={context.workspace.slug}
                label="New page"
              />
            </div>
          </div>

          <div className="mt-7 grid gap-2.5 sm:grid-cols-3">
            <StatCard
              icon={<Layers size={14} strokeWidth={1.75} />}
              label="Pages"
              value={String(context.documents.length)}
            />
            <StatCard
              icon={<Users size={14} strokeWidth={1.75} />}
              label="Members"
              value={String(context.members.length)}
            />
            <StatCard
              icon={<Clock3 size={14} strokeWidth={1.75} />}
              label="Last edited"
              value={lastEdited ? relativeTime(lastEdited) : "Just now"}
            />
          </div>
        </section>

        <div className="mt-9 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <section>
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="font-sans text-[14px] font-medium tracking-[-0.01em] text-ink">
                    Favorites
                  </h2>
                  <p className="mt-0.5 text-[10.5px] text-ink-faint">
                    The pages this workspace keeps close.
                  </p>
                </div>
                <span className="text-[9.5px] text-ink-faint">{favorites.length} pinned</span>
              </div>

              {favorites.length > 0 ? (
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                  {favorites.map((document) => (
                    <Link
                      key={document.id}
                      href={`/w/${context.workspace.slug}/d/${document.id}`}
                      className="group relative flex flex-col overflow-hidden rounded-2xl border border-line/80 bg-surface/45 p-4 shadow-[0_16px_40px_-36px_rgb(var(--shadow-base)/0.55)] backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-line-bright hover:bg-tint-2"
                    >
                      <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tint-5 to-transparent" />
                      <div className="flex items-start justify-between">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-tint-2 text-ink-muted transition-colors group-hover:text-ink">
                          <IconGlyph name={document.icon} size={14} />
                        </span>
                        <Pin
                          size={11}
                          strokeWidth={1.75}
                          className="text-neon-emerald/70"
                          fill="currentColor"
                        />
                      </div>
                      <p className="mt-3 line-clamp-2 min-h-[34px] text-[12.5px] font-medium leading-snug text-ink">
                        {document.title}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-[9.5px] text-ink-faint">
                        <span>{relativeTime(document.updatedAt)}</span>
                        <ArrowUpRight
                          size={12}
                          strokeWidth={1.75}
                          className="translate-y-0.5 text-ink-faint opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:text-ink-muted group-hover:opacity-100"
                        />
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-tint-1 px-6 py-10 text-center">
                  <Pin size={18} strokeWidth={1.5} className="text-ink-faint" />
                  <p className="text-xs font-medium text-ink">No favorites yet</p>
                  <p className="max-w-[280px] text-[10.5px] leading-relaxed text-ink-faint">
                    Pin a page from the sidebar to keep it within reach.
                  </p>
                </div>
              )}
            </section>

            <section className="mt-9">
              <div className="mb-3 flex items-end justify-between">
                <div>
                  <h2 className="font-sans text-[14px] font-medium tracking-[-0.01em] text-ink">
                    Recently edited
                  </h2>
                  <p className="mt-0.5 text-[10.5px] text-ink-faint">
                    Pick up where the team left off.
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-line/80 bg-surface/45 backdrop-blur-sm">
                {recents.map((document, index) => (
                  <Link
                    key={document.id}
                    href={`/w/${context.workspace.slug}/d/${document.id}`}
                    className={`group flex items-center gap-3 px-4 py-3 transition-colors hover:bg-tint-3 ${
                      index !== recents.length - 1 ? "border-b border-line" : ""
                    }`}
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line bg-tint-2 text-ink-muted">
                      <IconGlyph name={document.icon} size={13} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12px] font-medium text-ink">{document.title}</p>
                      <p className="text-[9.5px] text-ink-faint">
                        Updated {relativeTime(document.updatedAt)}
                      </p>
                    </div>
                    <div className="hidden items-center gap-1.5 text-[9.5px] text-ink-faint sm:flex">
                      <FileText size={10} strokeWidth={1.75} />
                      Page
                    </div>
                    <ArrowUpRight
                      size={13}
                      strokeWidth={1.75}
                      className="text-ink-faint opacity-0 transition-opacity group-hover:opacity-100"
                    />
                  </Link>
                ))}
                {recents.length === 0 && (
                  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
                    <FileText size={18} strokeWidth={1.5} className="text-ink-faint" />
                    <p className="text-xs text-ink-muted">No pages yet. Create the first one.</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          <aside className="space-y-3">
            <RealtimeStatus />

            <section className="rounded-2xl panel-card p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[11.5px] font-medium text-ink">Members</h2>
                <span className="text-[9.5px] text-ink-faint">{context.members.length}</span>
              </div>
              <div className="mt-3 space-y-0.5">
                {context.members.slice(0, 6).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 transition-colors hover:bg-tint-3"
                  >
                    <Avatar name={member.name} color={member.color} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-medium text-ink">
                        {member.name}
                        {member.id === session.id && (
                          <span className="ml-1.5 text-[8.5px] font-normal text-ink-faint">
                            you
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[9px] text-ink-faint">
                        {member.title ?? roleLabels[member.role]}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-tint-2 px-1.5 py-0.5 text-[7.5px] font-medium text-ink-faint">
                      {roleLabels[member.role]}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl panel-card p-4">
              <h2 className="text-[11.5px] font-medium text-ink">Quick actions</h2>
              <div className="mt-3 space-y-1.5">
                <SearchPagesButton />
                <Link
                  href={
                    nextPage
                      ? `/w/${context.workspace.slug}/d/${nextPage.id}`
                      : `/w/${context.workspace.slug}`
                  }
                  className="button-secondary w-full justify-start"
                >
                  {nextPage ? (
                    <FileText size={14} strokeWidth={1.75} className="text-ink-faint" />
                  ) : (
                    <Home size={14} strokeWidth={1.75} className="text-ink-faint" />
                  )}
                  {nextPage ? "Continue recent page" : "Open workspace"}
                </Link>
              </div>
              <p className="mt-3 text-[9px] leading-relaxed text-ink-faint">
                Every edit is persisted as a CRDT update and compacted into Postgres
                snapshots. Nothing gets overwritten.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl panel-card px-4 py-3">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-tint-2 text-ink-faint">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[9.5px] text-ink-faint">{label}</p>
        <p className="truncate text-[13px] font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}
