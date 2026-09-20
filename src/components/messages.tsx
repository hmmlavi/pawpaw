"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  MessagesSquare, Send, Loader2, Plus, X, ImagePlus, Check, Ban, Users, Inbox, ArrowLeft, ExternalLink,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { PetLite } from "@/lib/queries";
import { loadConversations, loadConversationDetail } from "@/lib/queries";
import { PetAvatar, EmptyState } from "@/components/ui";
import { AuthorRow, RichText } from "@/components/feed";
import {
  sendMessageAction, markConversationReadAction, acceptMessageRequestAction, declineMessageRequestAction,
  openConversationAction, createGroupAction,
} from "@/actions/messages";
import { searchPetsAction } from "@/actions/pets";
import { toast } from "sonner";

type ConvSummary = Awaited<ReturnType<typeof loadConversations>>["inbox"][number];
type ConvDetail = NonNullable<Awaited<ReturnType<typeof loadConversationDetail>>>;

export function MessagesApp({
  me,
  inbox,
  requests,
  activeId,
  detail,
}: {
  me: PetLite;
  inbox: ConvSummary[];
  requests: ConvSummary[];
  activeId: string | null;
  detail: ConvDetail | null;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"inbox" | "requests">(requests.length > 0 && inbox.length === 0 ? "requests" : "inbox");
  const [newOpen, setNewOpen] = useState(false);
  const list = tab === "inbox" ? inbox : requests;
  const [, start] = useTransition();

  const openConv = (id: string) => {
    markConversationReadAction(id).catch(() => {});
    router.push(`/messages?c=${id}`, { scroll: false });
  };

  return (
    <div className="glass-deep relative grid h-[calc(100dvh-11.5rem)] min-h-[520px] grid-cols-1 overflow-hidden rounded-[28px] animate-rise md:grid-cols-[320px,minmax(0,1fr)]">
      {/* ── List pane ──────────────────────── */}
      <aside className={cn("flex min-h-0 flex-col border-r border-white/7", activeId && "hidden md:flex")}>
        <div className="flex items-center justify-between border-b border-white/7 px-4 py-3.5">
          <div className="flex gap-1.5">
            <button onClick={() => setTab("inbox")} className="chip !py-1.5" data-active={tab === "inbox"}>
              <Inbox className="h-3.5 w-3.5" /> Inbox {inbox.filter((c) => c.unread).length > 0 && <span className="on-dark ml-0.5 rounded-full bg-clay px-1.5 text-[9px] font-bold text-white">{inbox.filter((c) => c.unread).length}</span>}
            </button>
            <button onClick={() => setTab("requests")} className="chip !py-1.5" data-active={tab === "requests"}>
              Requests {requests.length > 0 && <span className="ml-0.5 rounded-full bg-sand/80 px-1.5 text-[9px] font-bold text-on-sand">{requests.length}</span>}
            </button>
          </div>
          <button onClick={() => setNewOpen(true)} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="New conversation">
            <Plus className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2">
          {list.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <MessagesSquare className="text-faint mb-3 h-6 w-6" />
              <p className="text-sm font-bold text-white/80">{tab === "inbox" ? "Your pet's inbox is quiet" : "No requests"}</p>
              <p className="text-faint mt-1 text-xs leading-relaxed">
                {tab === "inbox" ? "When pets message each other, conversations live here." : "Messages from pets you don't follow back land here first."}
              </p>
              {tab === "inbox" && (
                <button onClick={() => setNewOpen(true)} className="btn-ghost mt-4 !px-3.5 !py-1.5 text-xs">Start a conversation</button>
              )}
            </div>
          )}
          {list.map((c) => (
            <button key={c.id} onClick={() => openConv(c.id)}
              className={cn("flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-colors", c.id === activeId ? "bg-accent/12" : "hover:bg-white/5")}>
              {c.isGroup ? (
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky/15 border border-sky/25"><Users className="h-4.5 w-4.5 text-sky" /></span>
              ) : (
                <PetAvatar avatarFileId={c.peers[0]?.avatar ? c.peers[0].avatar.replace("/api/file/", "") : null} name={c.peers[0]?.name ?? "?"} icon={c.peers[0]?.icon ?? "paw"} size="md" />
              )}
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", c.unread ? "font-extrabold text-white" : "font-bold text-white/85")}>
                    {c.isGroup ? (c.title || "Group chat") : c.peers.map((p) => p.name).join(", ") || "Conversation"}
                  </span>
                  <span className="text-faint shrink-0 text-[10px]">{timeAgo(c.lastAt)}</span>
                </span>
                <span className={cn("mt-0.5 block truncate text-xs", c.unread ? "font-semibold text-white/75" : "text-faint")}>{c.lastText}</span>
              </span>
              {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-accent shadow-[0_0_8px_2px_rgba(143,185,220,0.5)]" />}
            </button>
          ))}
        </div>
      </aside>

      {/* ── Thread pane ────────────────────── */}
      <section className={cn("flex min-h-0 flex-col", !activeId && "hidden md:flex")}>
        {!detail ? (
          <div className="flex h-full flex-col items-center justify-center px-8 text-center">
            <span className="glass-sheen mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-sky/12 border border-white/10">
              <Send className="h-5.5 w-5.5 text-accent/80" />
            </span>
            <p className="text-sm font-bold text-white/85">Pick a conversation</p>
            <p className="text-faint mt-1 max-w-2xs text-xs leading-relaxed">Pet-to-pet messages, shared posts and voice of the community — all in one place.</p>
          </div>
        ) : (
          <Thread key={detail.id} me={me} detail={detail} onBack={() => router.push("/messages", { scroll: false })} />
        )}
      </section>

      {newOpen && <NewConversation me={me} onClose={() => setNewOpen(false)} />}
    </div>
  );
}

function Thread({ me, detail, onBack }: { me: PetLite; detail: ConvDetail; onBack: () => void }) {
  const [messages, setMessages] = useState(detail.messages);
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  const [, setTick] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lastAtRef = useRef<string>(detail.messages[detail.messages.length - 1]?.createdAt ?? new Date(0).toISOString());

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "auto" }); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  // lightweight polling for new messages
  useEffect(() => {
    let alive = true;
    const poll = setInterval(async () => {
      try {
        const { getConversationUpdatesAction } = await import("@/actions/messages");
        const updates = (await getConversationUpdatesAction(detail.id, lastAtRef.current)) as { id: string; createdAt: Date }[];
        if (!alive || updates.length === 0) return;
        // simplest correct approach: refresh the server component data
        window.dispatchEvent(new Event("messages:refresh"));
      } catch { /* offline-safe */ }
    }, 6000);
    return () => { alive = false; clearInterval(poll); };
  }, [detail.id]);

  const router = useRouter();
  useEffect(() => {
    const handler = () => router.refresh();
    window.addEventListener("messages:refresh", handler);
    return () => window.removeEventListener("messages:refresh", handler);
  }, [router]);

  useEffect(() => {
    lastAtRef.current = detail.messages[detail.messages.length - 1]?.createdAt ?? new Date(0).toISOString();
    setMessages(detail.messages);
    setTick((t) => t + 1);
  }, [detail]);

  const send = (file?: File) => {
    if (!text.trim() && !file) return;
    const fd = new FormData();
    fd.set("conversationId", detail.id);
    fd.set("text", text);
    if (file) fd.set("media", file);
    const optimistic = {
      id: `tmp-${Date.now()}`, kind: file ? (file.type.startsWith("video/") ? "video" : "image") : "text",
      text, fileUrl: file ? URL.createObjectURL(file) : null, createdAt: new Date().toISOString(),
      mine: true, sender: me, shared: null,
    };
    setMessages((m) => [...m, optimistic]);
    setText("");
    start(async () => {
      const res = await sendMessageAction(fd);
      if (res.ok) {
        lastAtRef.current = new Date().toISOString();
        router.refresh();
      } else {
        setMessages((m) => m.filter((x) => x.id !== optimistic.id));
        toast.error(res.error ?? "Message could not be sent.");
        setText(optimistic.text);
      }
    });
  };

  const title = detail.isGroup ? (detail.title || "Group chat") : detail.peers.map((p) => p.name).join(", ") || "Conversation";
  const peer = detail.peers[0];

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/7 px-4 py-3">
        <button onClick={onBack} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl md:hidden" aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </button>
        {peer ? <AuthorRow pet={peer} size="sm" sub={detail.isGroup ? `${detail.peers.length + 1} members` : `@${peer.username}`} /> : (
          <span className="text-sm font-bold text-white/90">{title}</span>
        )}
        {peer && !detail.isGroup && (
          <Link href={`/profile/${peer.username}`} className="btn-ghost ml-auto !px-3 !py-1.5 text-xs">
            <ExternalLink className="h-3 w-3" /> Profile
          </Link>
        )}
      </div>

      {detail.pending && (
        <div className="border-b border-sand/20 bg-sand/8 px-4 py-3 animate-fade">
          <p className="text-xs text-sand/95">
            <span className="font-bold">{peer?.name}</span> wants to message {me.name}. Accept to reply.
          </p>
          <div className="mt-2 flex gap-2">
            <button className="btn-primary !px-3.5 !py-1.5 text-xs" disabled={pending}
              onClick={() => start(async () => { const r = await acceptMessageRequestAction(detail.id); if (r.ok) { toast.success("Request accepted."); router.refresh(); } })}>
              <Check className="h-3.5 w-3.5" /> Accept
            </button>
            <button className="btn-ghost !px-3.5 !py-1.5 text-xs" disabled={pending}
              onClick={() => start(async () => { const r = await declineMessageRequestAction(detail.id); if (r.ok) { router.push("/messages"); router.refresh(); } })}>
              <Ban className="h-3.5 w-3.5" /> Decline
            </button>
          </div>
        </div>
      )}

      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-sm font-bold text-white/80">The conversation starts here</p>
            <p className="text-faint mt-1 text-xs">Say hi as {me.name} — pets do the talking here.</p>
          </div>
        )}
        {messages.map((m, i) => {
          const showSender = detail.isGroup && !m.mine && (i === 0 || messages[i - 1].sender.id !== m.sender.id);
          return (
            <div key={m.id} className={cn("flex animate-rise-fast", m.mine ? "justify-end" : "justify-start")}>
              {!m.mine && detail.isGroup && (
                <span className="mr-2 mt-auto">
                  {showSender ? <PetAvatar avatarFileId={m.sender.avatar ? m.sender.avatar.replace("/api/file/", "") : null} name={m.sender.name} icon={m.sender.icon} size="xs" /> : <span className="block w-7" />}
                </span>
              )}
              <div className={cn("max-w-[78%] sm:max-w-[65%]")}>
                {showSender && <p className="text-faint mb-1 pl-1 text-[10px] font-bold">{m.sender.name}</p>}
                <div className={cn(
                  "overflow-hidden rounded-2xl",
                  m.mine ? "bg-gradient-to-br from-accent/85 to-accent-deep/85 text-on-accent rounded-br-md" : "glass-hair text-white/88 rounded-bl-md",
                )}>
                  {m.shared && (
                    <Link href={`/profile/${m.shared.authorUsername}`} className="block border-b border-white/10 bg-black/20 p-2.5">
                      <div className="flex items-center gap-2.5">
                        {m.shared.media[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.shared.media[0]} alt="" className="h-12 w-12 rounded-lg object-cover" />
                        )}
                        <div className="min-w-0">
                          <p className={cn("text-[11px] font-bold", m.mine ? "text-on-accent-soft" : "text-white/80")}>{m.shared.authorName}'s {m.shared.kind}</p>
                          <p className={cn("truncate text-[11px]", m.mine ? "text-on-accent-faint" : "text-white/55")}>{m.shared.caption || "Shared post"}</p>
                        </div>
                      </div>
                    </Link>
                  )}
                  {m.fileUrl && (
                    m.kind === "video" ? (
                      <video src={m.fileUrl} controls playsInline className="max-h-64 w-full bg-black/30 object-contain" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.fileUrl} alt="" className="max-h-64 w-full object-cover" />
                    )
                  )}
                  {m.text && <p className="whitespace-pre-wrap break-words px-3.5 py-2.5 text-sm leading-relaxed">{m.text}</p>}
                </div>
                <p className={cn("text-faint mt-1 text-[10px]", m.mine ? "text-right" : "text-left")}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {!detail.pending && (
        <div className="border-t border-white/7 p-3">
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) send(f); e.target.value = ""; }} />
          <div className="flex items-center gap-2">
            <button onClick={() => fileRef.current?.click()} className="glass-hair flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-white/10" aria-label="Attach">
              <ImagePlus className="h-4.5 w-4.5 text-white/65" />
            </button>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
              placeholder={`Message as ${me.name}…`}
              maxLength={2000}
              className="field !rounded-2xl"
            />
            <button onClick={() => send()} disabled={pending || !text.trim()} className="btn-primary h-10 w-10 shrink-0 !rounded-2xl !p-0" aria-label="Send">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function NewConversation({ me, onClose }: { me: PetLite; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchPetsAction>>>([]);
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof searchPetsAction>>>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => setResults(q.trim() ? await searchPetsAction(q) : []), 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  const togglePick = (p: Awaited<ReturnType<typeof searchPetsAction>>[number]) => {
    setSelected((s) => (s.some((x) => x.id === p.id) ? s.filter((x) => x.id !== p.id) : [...s, p]));
  };

  const begin = () => {
    if (selected.length === 0) return;
    start(async () => {
      if (selected.length === 1) {
        const res = await openConversationAction(selected[0].id);
        if (res.conversationId) {
          onClose();
          router.push(`/messages?c=${res.conversationId}`);
          router.refresh();
        } else toast.error(res.error ?? "Could not start conversation.");
      } else {
        const res = await createGroupAction(groupTitle || `${me.name}'s circle`, selected.map((s) => s.id));
        if (res.ok) { onClose(); router.refresh(); toast.success("Group created."); }
        else toast.error(res.error ?? "Could not create group.");
      }
    });
  };

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center animate-fade" onClick={onClose}>
      <div className="glass-deep w-full max-w-md rounded-[24px] p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="card-title text-base font-bold">New conversation</h3>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        {selected.length > 1 && (
          <input value={groupTitle} onChange={(e) => setGroupTitle(e.target.value)} placeholder="Group name (optional)" className="field mb-2" maxLength={40} />
        )}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pets by name or @username…" className="field" autoFocus />
        {selected.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selected.map((p) => (
              <button key={p.id} onClick={() => togglePick(p)} className="chip !border-accent/40 !bg-accent/12 !text-accent">
                {p.name} <X className="h-3 w-3" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {results.filter((r) => !selected.some((s) => s.id === r.id)).map((p) => (
            <button key={p.id} onClick={() => togglePick(p)} className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left transition-colors hover:bg-white/6">
              <PetAvatar avatarFileId={p.avatar ? p.avatar.replace("/api/file/", "") : null} name={p.name} icon={p.animalType} size="sm" />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-white/90">{p.name}</span>
                <span className="text-faint block truncate text-xs">@{p.username}{p.city ? ` · ${p.city}` : ""}</span>
              </span>
              <Plus className="text-faint ml-auto h-4 w-4" />
            </button>
          ))}
          {q.trim() && results.length === 0 && <p className="text-faint py-4 text-center text-xs">No pets found.</p>}
        </div>
        <button onClick={begin} disabled={selected.length === 0 || pending} className="btn-primary mt-3 w-full text-sm">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : selected.length > 1 ? `Create group (${selected.length + 1})` : "Start chatting"}
        </button>
      </div>
    </div>
  );
}
