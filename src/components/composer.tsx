"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Loader2, ImagePlus, MapPin, Globe, Users, Type, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPostAction } from "@/actions/content";
import { sendAiMessageAction, aiConfiguredAction } from "@/actions/ai";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function Composer({
  kind,
  petName,
  city,
  onClose,
}: {
  kind: "post" | "reel" | "story";
  petName: string;
  city: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(city);
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [textStory, setTextStory] = useState(false);
  const [aiHelping, setAiHelping] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const maxFiles = kind === "post" ? 8 : 1;
  const accept = kind === "reel" ? "video/*" : kind === "story" ? "image/*,video/*" : "image/*";

  useEffect(() => {
    aiConfiguredAction().then((r) => setAiAvailable(r.configured)).catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const next = [...files, ...Array.from(list)].slice(0, maxFiles);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const removeFile = (i: number) => {
    const next = files.filter((_, idx) => idx !== i);
    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const aiSuggestCaption = async () => {
    setAiHelping(true);
    try {
      const res = await sendAiMessageAction({
        text: `Suggest 3 short, warm caption options (under 80 characters each, no hashtags) for a ${kind} ${files.length ? `featuring ${files[0]?.type.startsWith("video") ? "a video" : "a photo"}` : "about my pet"}. My pet's name is ${petName}. Return just the 3 captions, one per line.`,
      });
      if (res.ok && res.assistantMessage) {
        const first = res.assistantMessage.content.split("\n").map((l) => l.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
        if (first[0]) {
          setCaption((c) => (c ? c : first[0]));
          toast.success("Caption suggestion added — feel free to edit it.");
        }
      } else if (res.notConfigured) {
        toast.info("AI suggestions aren't connected yet. Add AI_API_KEY to enable them.");
      } else {
        toast.error(res.error ?? "AI suggestion failed.");
      }
    } finally {
      setAiHelping(false);
    }
  };

  const publish = () => {
    if (kind === "story" && textStory && caption.trim().length === 0) {
      toast.error("Write something for your text story.");
      return;
    }
    if (kind === "reel" && files.length === 0) {
      toast.error("Choose a video for your reel.");
      return;
    }
    if (kind === "post" && files.length === 0) {
      toast.error("Add at least one photo.");
      return;
    }
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("caption", caption);
    fd.set("location", location);
    fd.set("visibility", visibility);
    if (kind === "story" && textStory) fd.set("textStyle", "gradient");
    files.forEach((f) => fd.append("media", f));
    start(async () => {
      const res = await createPostAction(fd);
      if (res.ok) {
        toast.success(kind === "post" ? "Post published." : kind === "reel" ? "Reel published." : "Story shared — it lives for 24 hours.");
        onClose();
        if (kind === "reel") router.push("/reels");
        router.refresh();
      } else {
        toast.error(res.error ?? "Could not publish.");
      }
    });
  };

  const titles = { post: "New post", reel: "New reel", story: "New story" };

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep glass-sheen flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="card-title text-lg font-bold">{titles[kind]}</h2>
            <p className="text-faint text-xs">Publishing as <span className="font-semibold text-sage">{petName}</span></p>
          </div>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4">
          {/* media */}
          {!(kind === "story" && textStory) && (
            <div>
              <input ref={fileRef} type="file" accept={accept} multiple={maxFiles > 1} className="hidden" onChange={(e) => addFiles(e.target.files)} />
              {previews.length === 0 ? (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/16 bg-white/3 py-10 transition-colors hover:border-sage/40 hover:bg-sage/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sage/12 border border-sage/25">
                    <ImagePlus className="h-5.5 w-5.5 text-sage" />
                  </span>
                  <span className="text-sm font-semibold text-white/80">{kind === "reel" ? "Choose a vertical video" : kind === "story" ? "Choose a photo or video" : "Choose photos"}</span>
                  <span className="text-faint text-xs">{kind === "post" ? `Up to ${maxFiles} images · under 12MB each` : kind === "reel" ? "MP4/WebM · under 60MB · audio edits happen in your editor" : "Lives for 24 hours"}</span>
                </button>
              ) : (
                <div className={cn("grid gap-2", previews.length > 1 ? "grid-cols-3" : "grid-cols-1")}>
                  {previews.map((src, i) => (
                    <div key={i} className={cn("group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40", files[i]?.type.startsWith("video") || kind === "reel" ? "aspect-[9/16]" : "aspect-square")}>
                      {files[i]?.type.startsWith("video/") ? (
                        <video src={src} className="h-full w-full object-cover" controls muted playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt="" className="h-full w-full object-cover" />
                      )}
                      <button type="button" onClick={() => removeFile(i)} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/90 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remove">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {kind === "post" && previews.length < maxFiles && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/16 bg-white/3 transition-colors hover:border-sage/40">
                      <ImagePlus className="text-faint h-5 w-5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* story text toggle */}
          {kind === "story" && (
            <div className="flex gap-1.5">
              <button type="button" onClick={() => setTextStory(false)} className="chip flex-1 justify-center !py-2" data-active={!textStory}><ImagePlus className="h-3.5 w-3.5" /> Media story</button>
              <button type="button" onClick={() => { setTextStory(true); setFiles([]); setPreviews([]); }} className="chip flex-1 justify-center !py-2" data-active={textStory}><Type className="h-3.5 w-3.5" /> Text story</button>
            </div>
          )}

          {kind === "story" && textStory && (
            <div className="flex min-h-44 items-center justify-center rounded-2xl bg-gradient-to-br from-sage/25 via-ink-3 to-sky/20 p-6 text-center animate-fade">
              <p className="font-display text-lg font-semibold leading-snug text-white/90 whitespace-pre-wrap break-words">{caption || "Write something…"}</p>
            </div>
          )}

          {/* caption */}
          <div>
            <div className="flex items-center justify-between">
              <label className="label !mb-0">{kind === "story" && textStory ? "Story text" : "Caption"}</label>
              {aiAvailable && (
                <button type="button" onClick={aiSuggestCaption} disabled={aiHelping} className="flex items-center gap-1 text-[11px] font-semibold text-sage transition-opacity hover:opacity-80 disabled:opacity-50">
                  {aiHelping ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} AI assist
                </button>
              )}
            </div>
            <textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={kind === "story" && textStory ? 3 : 2} maxLength={kind === "reel" ? 300 : 1200}
              className="field mt-1.5 resize-none"
              placeholder={kind === "story" && textStory ? "Share a moment in words…" : `Write a caption as ${petName}… #use #hashtags and @mention friends`} />
          </div>

          {/* location + visibility */}
          {kind !== "story" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="relative">
                <MapPin className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="field !pl-10" placeholder="City / place" maxLength={60} />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setVisibility("public")} className="chip justify-center !py-2.5" data-active={visibility === "public"}><Globe className="h-3.5 w-3.5" /> Public</button>
                <button type="button" onClick={() => setVisibility("followers")} className="chip justify-center !py-2.5" data-active={visibility === "followers"}><Users className="h-3.5 w-3.5" /> Followers</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/7 px-5 py-4">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={publish} disabled={pending} className="btn-primary text-sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "story" ? "Share story" : "Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
