import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireSession } from "@/lib/auth";
import { getDocumentPageData } from "@/lib/data";
import { createRealtimeToken } from "@/lib/realtime-token";
import { DocumentWorkspace } from "@/components/editor/document-workspace";

export const metadata: Metadata = {
  title: "Page",
};

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const session = await requireSession();
  const { slug, id } = await params;
  const data = await getDocumentPageData(slug, id, session.id);
  if (!data) notFound();

  const realtimeToken = await createRealtimeToken(session, data.document.id);

  return (
    <DocumentWorkspace
      data={data}
      realtimeToken={realtimeToken}
      user={{
        id: session.id,
        name: session.name,
        color: session.color,
        title: session.title ?? null,
      }}
    />
  );
}
