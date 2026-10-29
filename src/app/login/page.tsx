import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { LoginView } from "@/components/auth/login-view";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const session = await getSession();
  if (session) {
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.id },
      include: { workspace: { select: { slug: true } } },
      orderBy: { createdAt: "asc" },
    });
    if (membership) redirect(`/w/${membership.workspace.slug}`);
  }

  const { next } = await searchParams;
  return <LoginView nextPath={next ?? null} />;
}
