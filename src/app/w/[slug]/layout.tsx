import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getWorkspaceContext } from "@/lib/data";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const session = await requireSession();
  const { slug } = await params;
  const context = await getWorkspaceContext(slug, session.id);
  if (!context) notFound();

  return (
    <WorkspaceShell
      user={{
        id: session.id,
        name: session.name,
        color: session.color,
        title: session.title ?? null,
      }}
      context={context}
    >
      {children}
    </WorkspaceShell>
  );
}
