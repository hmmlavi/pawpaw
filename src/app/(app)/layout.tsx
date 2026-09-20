import { getActiveContext } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { AppFrame } from "@/components/app-frame";
import { fileUrl, animalIcon } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getActiveContext();
  if (!ctx?.user) redirect("/login");
  if (ctx.pets.length === 0) redirect("/onboarding");

  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, ctx.user.id), eq(notifications.read, false)));

  const toShell = (p: typeof ctx.pets[number]) => ({
    id: p.id,
    name: p.name,
    username: p.username,
    icon: p.identityIcon || animalIcon(p.animalType),
    avatar: fileUrl(p.avatarFileId),
  });

  return (
    <AppFrame
      activePet={ctx.activePet ? toShell(ctx.activePet) : null}
      pets={ctx.pets.map(toShell)}
      unread={row?.n ?? 0}
      city={ctx.activePet?.city || ctx.user.city || ""}
    >
      {children}
    </AppFrame>
  );
}
