import { getActiveContext } from "@/lib/auth";
import { loadConversations, loadConversationDetail, toPetLite } from "@/lib/queries";
import { MessagesApp } from "@/components/messages";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages" };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const { c } = await searchParams;

  const { inbox, requests } = await loadConversations(ctx.activePet.id);
  const detail = c ? await loadConversationDetail(c, ctx.activePet.id) : null;

  return (
    <div>
      <header className="mb-4 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Pet-to-pet</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Messages</h1>
      </header>
      <MessagesApp
        me={toPetLite(ctx.activePet)}
        inbox={inbox}
        requests={requests}
        activeId={detail?.id ?? null}
        detail={detail}
      />
    </div>
  );
}
