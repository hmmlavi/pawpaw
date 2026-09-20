import { getActiveContext } from "@/lib/auth";
import { db } from "@/db";
import { blocks, pets } from "@/db/schema";
import { eq } from "drizzle-orm";
import { SettingsClient } from "@/components/settings";
import { toPetLite } from "@/lib/queries";
import { fileUrl, animalIcon } from "@/lib/utils";
import { MAX_PETS } from "@/lib/constants";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) redirect("/login");

  const myBlocks = await db.select({ pet: pets }).from(blocks).innerJoin(pets, eq(pets.id, blocks.blockedId))
    .where(eq(blocks.blockerId, ctx.activePet.id)).limit(50);

  return (
    <div className="mb-4">
      <header className="mb-5 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Control room</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Settings</h1>
      </header>
      <SettingsClient
        email={ctx.user.email}
        displayName={ctx.user.displayName}
        city={ctx.user.city ?? ""}
        pets={ctx.pets.map((p) => ({ id: p.id, name: p.name, username: p.username, icon: p.identityIcon || animalIcon(p.animalType), avatar: fileUrl(p.avatarFileId) }))}
        activePetId={ctx.activePet.id}
        maxPets={MAX_PETS}
        blocked={myBlocks.map((b) => toPetLite(b.pet))}
      />
    </div>
  );
}
