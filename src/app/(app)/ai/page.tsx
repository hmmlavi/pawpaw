import { getActiveContext } from "@/lib/auth";
import { toPetLite } from "@/lib/queries";
import { AiChat } from "@/components/ai-chat";
import { listAiConversationsAction, loadAiConversationAction, aiConfiguredAction } from "@/actions/ai";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI assistant" };

export default async function AiPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const { c } = await searchParams;

  const [convs, active, configured] = await Promise.all([
    listAiConversationsAction(),
    c ? loadAiConversationAction(c) : Promise.resolve(null),
    aiConfiguredAction(),
  ]);

  return (
    <div>
      <header className="mb-4 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Intelligence layer</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Pet care assistant</h1>
      </header>
      <AiChat
        pet={toPetLite(ctx.activePet)}
        initialConversationId={active?.conversation.id ?? null}
        initialMessages={active ? active.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })) : []}
        conversations={convs.map((x) => ({ id: x.id, title: x.title }))}
        configured={configured.configured}
      />
    </div>
  );
}
