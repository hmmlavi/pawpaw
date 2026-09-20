"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Send, Loader2, Camera, HeartPulse, Baby, Leaf, Scissors, Dumbbell, HelpCircle,
  Stethoscope, X, Trash2, CirclePlus, TriangleAlert, ImageOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PetLite } from "@/lib/queries";
import { PetAvatar } from "@/components/ui";
import { sendAiMessageAction, deleteAiConversationAction } from "@/actions/ai";
import { toast } from "sonner";
import Link from "next/link";

type Message = { id: string; role: string; content: string; pending?: boolean };

const QUICK = [
  { icon: HeartPulse, label: "Health", tint: "text-clay", prompt: "I have a health question about my pet: " },
  { icon: HelpCircle, label: "Behavior", tint: "text-sky", prompt: "I'd like to understand my pet's behavior — they're showing signs of " },
  { icon: Dumbbell, label: "Training", tint: "text-sage", prompt: "Help me with training. I want to work on " },
  { icon: Leaf, label: "Nutrition", tint: "text-sage", prompt: "Nutrition question: is it okay for my pet to eat " },
  { icon: Scissors, label: "Grooming", tint: "text-sky", prompt: "Grooming question: how should I handle " },
  { icon: Baby, label: "Care", tint: "text-sand", prompt: "Everyday care question — how much " },
];

export function AiChat({
  pet,
  initialConversationId,
  initialMessages,
  conversations,
  configured,
}: {
  pet: PetLite | null;
  initialConversationId: string | null;
  initialMessages: Message[];
  conversations: { id: string; title: string }[];
  configured: boolean;
}) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages, thinking]);

  const pickImage = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) { toast.error("Photo analysis needs an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        // downscale to keep payload sane
        const max = 1280;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
        const mime = f.type === "image/png" ? "image/png" : "image/jpeg";
        setImage({ dataUrl: canvas.toDataURL(mime, 0.85), name: f.name });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(f);
  };

  const send = (preset?: string) => {
    const text = (preset !== undefined ? (preset.endsWith(" ") ? preset : preset) : input).trim();
    const imageDataUrl = image?.dataUrl;
    if (!text && !imageDataUrl) return;
    if (!configured) {
      toast.info("The assistant isn't connected yet — add AI_API_KEY to your environment to enable it.");
      return;
    }
    const tempUser: Message = { id: `tmp-${Date.now()}`, role: "user", content: (text || "Please take a look at this photo of my pet.") + (imageDataUrl ? "\n[Photo attached for analysis]" : ""), pending: true };
    setMessages((m) => [...m, tempUser]);
    setInput(""); setImage(null);
    setThinking(true);
    start(async () => {
      try {
        const res = await sendAiMessageAction({ conversationId: conversationId ?? undefined, text, imageDataUrl });
        if (res.conversationId && !conversationId) setConversationId(res.conversationId);
        if (res.ok && res.assistantMessage) {
          setMessages((m) => m.map((x) => (x.id === tempUser.id ? { ...res.userMessage! } : x)).concat([res.assistantMessage!]));
        } else {
          setMessages((m) => m.filter((x) => x.id !== tempUser.id));
          if (res.notConfigured) toast.info("The assistant isn't connected yet — add AI_API_KEY to enable it.");
          else toast.error(res.error ?? "The assistant couldn't respond.");
          setInput(text);
        }
        router.refresh();
      } finally {
        setThinking(false);
        inputRef.current?.focus();
      }
    });
  };

  const suggestsVet = messages.length > 0 && /veterin|vet\b|clinic|professional/i.test(messages[messages.length - 1]?.content ?? "") && messages[messages.length - 1]?.role === "assistant";

  return (
    <div className="grid gap-5 lg:grid-cols-[300px,minmax(0,1fr))] lg:grid-cols-[300px,minmax(0,1fr)]">
      {/* ── Left rail ───────────────────────── */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
        {/* pet context */}
        {pet && (
          <div className="glass glass-sheen animate-rise rounded-3xl p-4">
            <p className="text-faint text-[10px] font-bold uppercase tracking-[0.16em]">Current context</p>
            <div className="mt-2.5 flex items-center gap-3">
              <PetAvatar avatarFileId={pet.avatar ? pet.avatar.replace("/api/file/", "") : null} name={pet.name} icon={pet.icon} size="md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white/92">{pet.name}</p>
                <p className="text-faint truncate text-xs">Answers use {pet.name}'s profile</p>
              </div>
            </div>
          </div>
        )}

        {/* quick topics */}
        <div className="glass grid grid-cols-3 gap-2 rounded-3xl p-3 animate-rise" style={{ animationDelay: "60ms" }}>
          {QUICK.map((q) => (
            <button key={q.label} onClick={() => { setInput(q.prompt); inputRef.current?.focus(); }}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-white/6 bg-white/3 px-1 py-3 transition-all hover:border-white/16 hover:bg-white/7 hover:-translate-y-0.5">
              <q.icon className={`h-4.5 w-4.5 ${q.tint}`} />
              <span className="text-[10px] font-bold text-white/70">{q.label}</span>
            </button>
          ))}
        </div>

        {/* photo analysis */}
        <button onClick={() => fileRef.current?.click()} className="glass glass-sheen glass-hover flex w-full items-center gap-3 rounded-3xl p-4 text-left animate-rise" style={{ animationDelay: "120ms" }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky/15 border border-sky/30">
            <Camera className="h-4.5 w-4.5 text-sky" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white/90">Photo analysis</span>
            <span className="text-faint block text-[11px] leading-snug">Identify species, possible breed & visible cues — never a diagnosis</span>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.target.files?.[0] ?? null)} />

        {/* clinics link */}
        <Link href="/services?cat=clinic" className="glass flex items-center gap-3 rounded-3xl p-4 animate-rise transition-colors hover:bg-white/6" style={{ animationDelay: "180ms" }}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage/15 border border-sage/30">
            <Stethoscope className="h-4.5 w-4.5 text-sage" />
          </span>
          <span>
            <span className="block text-sm font-bold text-white/90">Local clinics</span>
            <span className="text-faint block text-[11px]">Professional care near {pet?.city || "you"}</span>
          </span>
        </Link>

        {/* past conversations */}
        {conversations.length > 0 && (
          <div className="glass rounded-3xl p-2 animate-rise" style={{ animationDelay: "240ms" }}>
            <p className="text-faint px-3 pb-1.5 pt-2 text-[10px] font-bold uppercase tracking-[0.16em]">Recent</p>
            <div className="max-h-52 space-y-0.5 overflow-y-auto">
              {conversations.map((c) => (
                <div key={c.id} className={cn("group flex items-center gap-1 rounded-xl transition-colors", c.id === conversationId ? "bg-sage/12" : "hover:bg-white/5")}>
                  <Link href={`/ai?c=${c.id}`} className="min-w-0 flex-1 truncate px-3 py-2 text-xs text-white/75">{c.title}</Link>
                  <button onClick={() => start(async () => { await deleteAiConversationAction(c.id); if (c.id === conversationId) { setConversationId(null); setMessages([]); } router.refresh(); })}
                    className="mr-1.5 hidden rounded-lg p-1.5 text-white/35 transition-colors hover:text-clay group-hover:block" aria-label="Delete conversation">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </aside>

      {/* ── Chat area ───────────────────────── */}
      <section className="glass-deep glass-sheen flex h-[calc(100dvh-11rem)] min-h-[520px] flex-col overflow-hidden rounded-[28px] animate-rise" style={{ animationDelay: "80ms" }}>
        {/* header */}
        <div className="flex items-center gap-3 border-b border-white/7 px-5 py-3.5">
          <span className="relative flex h-9.5 w-9.5 items-center justify-center rounded-2xl bg-gradient-to-br from-sky/30 to-sage/20 border border-white/10">
            <Sparkles className="h-4.5 w-4.5 text-sky" />
            <span className={cn("absolute inset-0 rounded-2xl", thinking && "animate-pulse-ring")} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white/92">Pawmind</p>
            <p className="text-faint text-[11px]">{configured ? "Pet care assistant · not a veterinarian" : "Not connected — add AI_API_KEY"}</p>
          </div>
          {conversationId && (
            <button onClick={() => { setConversationId(null); setMessages([]); router.push("/ai"); }} className="btn-ghost !px-3 !py-1.5 text-xs">
              <CirclePlus className="h-3.5 w-3.5" /> New chat
            </button>
          )}
        </div>

        {/* messages */}
        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center text-center animate-fade">
              <span className="mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-sky/25 to-sage/15 border border-white/10">
                <Sparkles className="h-7 w-7 text-sky" />
              </span>
              <h2 className="card-title text-xl font-bold text-white/92">How can I help{pet ? ` with ${pet.name}` : ""}?</h2>
              <p className="text-dim mt-2 max-w-sm text-sm leading-relaxed">
                Ask about health, behavior, training, nutrition or grooming — or upload a photo for a careful visual read.
              </p>
              {configured ? (
                <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
                  {["How do I introduce my pet to a new home?", "What human foods are dangerous?", "My pet seems anxious when I leave", "Basics of leash training"].map((s) => (
                    <button key={s} onClick={() => setInput(s)} className="glass-hair rounded-2xl px-3.5 py-3 text-left text-xs text-white/70 transition-all hover:bg-white/8 hover:text-white/90">
                      {s}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mx-auto mt-6 max-w-md rounded-2xl border border-sand/25 bg-sand/8 p-4 text-left">
                  <p className="flex items-center gap-2 text-xs font-bold text-sand"><TriangleAlert className="h-3.5 w-3.5" /> Integration required</p>
                  <p className="text-dim mt-1.5 text-xs leading-relaxed">
                    This assistant is wired for a real AI service. Set <code className="rounded bg-white/8 px-1 text-sand">AI_API_KEY</code> (and optionally <code className="rounded bg-white/8 px-1 text-sand">AI_BASE_URL</code>, <code className="rounded bg-white/8 px-1 text-sand">AI_MODEL</code>) as environment variables to enable live answers and photo analysis.
                  </p>
                </div>
              )}
              <p className="text-faint mt-6 max-w-xs text-[11px] leading-relaxed">
                Pawmind gives general guidance, not veterinary diagnoses. In an emergency, contact a vet immediately.
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div key={m.id} className={cn("flex animate-rise-fast", m.role === "user" ? "justify-end" : "justify-start")}>
              {m.role === "assistant" && (
                <span className="mr-2.5 mt-1 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky/30 to-sage/20 border border-white/10">
                  <Sparkles className="h-3.5 w-3.5 text-sky" />
                </span>
              )}
              <div className={cn(
                "max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed sm:max-w-[70%]",
                m.role === "user"
                  ? "bg-gradient-to-br from-sage/85 to-sage-deep/85 text-ink font-medium rounded-br-md"
                  : "glass-hair text-white/88 rounded-bl-md",
                m.pending && "opacity-70",
              )}>
                {m.content.split("\n").map((line, i) => (
                  <p key={i} className={cn(i > 0 && "mt-2", line.startsWith("[Photo") && "text-[11px] italic opacity-75")}>{line}</p>
                ))}
              </div>
            </div>
          ))}

          {thinking && (
            <div className="flex justify-start animate-fade">
              <span className="mr-2.5 mt-1 flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky/30 to-sage/20 border border-white/10 animate-pulse-ring">
                <Sparkles className="h-3.5 w-3.5 text-sky" />
              </span>
              <div className="glass-hair flex items-center gap-1.5 rounded-2xl rounded-bl-md px-4 py-3.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 animate-bounce rounded-full bg-sky/70" style={{ animationDelay: `${i * 140}ms` }} />
                ))}
              </div>
            </div>
          )}

          {suggestsVet && (
            <div className="flex justify-start animate-rise-fast">
              <Link href="/services?cat=clinic" className="glass flex items-center gap-3 rounded-2xl p-3.5 transition-all hover:-translate-y-0.5 hover:bg-white/7">
                <Stethoscope className="h-4.5 w-4.5 shrink-0 text-sage" />
                <span>
                  <span className="block text-xs font-bold text-white/90">Professional care might help</span>
                  <span className="text-faint block text-[11px]">See veterinary clinics near {pet?.city || "you"} →</span>
                </span>
              </Link>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* composer */}
        <div className="border-t border-white/7 p-3.5 sm:p-4">
          {image && (
            <div className="mb-2.5 flex items-center gap-2.5 animate-fade">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.dataUrl} alt="To analyze" className="h-14 w-14 rounded-xl border border-white/15 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white/80">{image.name}</p>
                <p className="text-faint text-[10px]">Will be analyzed with your question — visual reads are never a diagnosis</p>
              </div>
              <button onClick={() => setImage(null)} className="glass-hair flex h-7 w-7 items-center justify-center rounded-lg" aria-label="Remove photo"><X className="h-3.5 w-3.5" /></button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button onClick={() => fileRef.current?.click()} className="glass-hair flex h-10.5 w-10.5 shrink-0 items-center justify-center rounded-2xl transition-colors hover:bg-white/10" aria-label="Attach photo">
              <ImageOff className="hidden" /><Camera className="h-4.5 w-4.5 text-white/65" />
            </button>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1}
              maxLength={3000}
              placeholder={configured ? `Ask about ${pet?.name ?? "your pet"}…` : "Connect an AI key to enable questions…"}
              className="field max-h-32 min-h-10.5 flex-1 resize-none !rounded-2xl !py-2.5"
            />
            <button onClick={() => send()} disabled={thinking || (!input.trim() && !image) || !configured}
              className="btn-primary h-10.5 w-10.5 shrink-0 !rounded-2xl !p-0" aria-label="Send">
              {thinking ? <Loader2 className="h-4.5 w-4.5 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
