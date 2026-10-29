import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.id },
    include: { workspace: { select: { slug: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!membership) redirect("/login");
  redirect(`/w/${membership.workspace.slug}`);
}
