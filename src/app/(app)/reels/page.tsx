import { getActiveContext } from "@/lib/auth";
import { loadReels, toPetLite } from "@/lib/queries";
import { ReelsFeed } from "@/components/reels";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Reels" };

export default async function ReelsPage() {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const reels = await loadReels(ctx.activePet.id);
  return (
    <div className="-mx-3 sm:mx-0">
      <ReelsFeed reels={reels} me={toPetLite(ctx.activePet)} />
    </div>
  );
}
