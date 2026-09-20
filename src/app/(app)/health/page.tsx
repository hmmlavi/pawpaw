import { getActiveContext } from "@/lib/auth";
import { loadHealth, toPetLite } from "@/lib/queries";
import { HealthVault } from "@/components/health";
import { PetAvatar } from "@/components/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Health vault" };

export default async function HealthPage() {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const records = await loadHealth(ctx.activePet.id);
  const me = toPetLite(ctx.activePet);

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 flex items-center gap-4 animate-rise">
        <PetAvatar avatarFileId={me.avatar ? me.avatar.replace("/api/file/", "") : null} name={me.name} icon={me.icon} size="lg" />
        <div>
          <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Private · only you</p>
          <h1 className="card-title mt-0.5 text-[26px] font-bold leading-tight text-white/95">{me.name}'s health vault</h1>
        </div>
      </header>
      <HealthVault
        petName={me.name}
        records={records.map((r) => ({
          id: r.id, kind: r.kind, title: r.title, details: r.details,
          recordDate: r.recordDate, weightKg: r.weightKg,
        }))}
      />
    </div>
  );
}
