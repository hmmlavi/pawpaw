"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Loader2, ImagePlus, MapPin, Globe, Users, Type, Sparkles, Trash2, Crop, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPostAction } from "@/actions/content";
import { sendAiMessageAction, aiConfiguredAction } from "@/actions/ai";
import { ImageEditor, type EditorAspect } from "@/components/image-editor";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type MediaItem = { file: File; original: File; preview: string; edited: boolean };

const POST_ASPECTS: EditorAspect[] = [
  { label: "Square", value: 1 },
  { label: "Portrait 4:5", value: 4 / 5 },
  { label: "Classic 4:3", value: 4 / 3 },
  { label: "Wide 3:2", value: 3 / 2 },
  { label: "Original", value: null },
];

const STORY_ASPECTS: EditorAspect[] = [
  { label: "Story 9:16", value: 9 / 16 },
  { label: "Square", value: 1 },
  { label: "Original", value: null },
];

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
  const [items, setItems] = useState<MediaItem[]>([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState(city);
  const [visibility, setVisibility] = useState<"public" | "followers">("public");
  const [textStory, setTextStory] = useState(false);
  const [aiHelping, setAiHelping] = useState(false);
  const [aiAvailable, setAiAvailable] = useState<boolean | null>(null);
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ index: number; src: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const maxFiles = kind === "post" ? 8 : 1;
  const accept = kind === "reel" ? "video/*" : kind === "story" ? "image/*,video/*" : "image/*";

  useEffect(() => {
    aiConfiguredAction().then((r) => setAiAvailable(r.configured)).catch(() => setAiAvailable(false));
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !editing) onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose, editing]);

  // Revoke previews only on unmount — removeItem/clearItems handle their own URLs,
  // so survivors stay valid when the list changes.
  const itemsRef = useRef(items);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((it) => URL.revokeObjectURL(it.preview)), []);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const fresh = Array.from(list).slice(0, Math.max(0, maxFiles - items.length));
    if (fresh.length === 0) return;
    setItems((prev) => [
      ...prev,
      ...fresh.map((f) => ({ file: f, original: f, preview: URL.createObjectURL(f), edited: false })),
    ]);
  };

  const removeItem = (i: number) => {
    setItems((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const clearItems = () => {
    setItems((prev) => {
      prev.forEach((it) => URL.revokeObjectURL(it.preview));
      return [];
    });
  };

  const startEditing = (i: number) => {
    const it = items[i];
    if (!it || !it.original.type.startsWith("image/")) return;
    // Always edit from the preserved original so repeated adjustments stay lossless.
    setEditing({ index: i, src: URL.createObjectURL(it.original) });
  };

  const confirmEdit = (blob: Blob) => {
    if (!editing) return;
    const idx = editing.index;
    URL.revokeObjectURL(editing.src);
    setEditing(null);
    setItems((prev) => {
      const it = prev[idx];
      if (!it) return prev;
      const file = new File([blob], it.original.name.replace(/\.[a-zA-Z0-9]+$/, "") + "-adjusted.jpg", {
        type: "image/jpeg",
      });
      URL.revokeObjectURL(it.preview);
      const next = [...prev];
      next[idx] = { ...it, file, preview: URL.createObjectURL(file), edited: true };
      return next;
    });
    toast.success("Photo adjusted.");
  };

  const revertEdit = (i: number) => {
    setItems((prev) => {
      const it = prev[i];
      if (!it) return prev;
      URL.revokeObjectURL(it.preview);
      const next = [...prev];
      next[i] = { ...it, file: it.original, preview: URL.createObjectURL(it.original), edited: false };
      return next;
    });
  };

  const aiSuggestCaption = async () => {
    setAiHelping(true);
    try {
      const res = await sendAiMessageAction({
        text: `Suggest 3 short, warm caption options (under 80 characters each, no hashtags) for a ${kind} ${items.length ? `featuring ${items[0]?.file.type.startsWith("video") ? "a video" : "a photo"}` : "about my pet"}. My pet's name is ${petName}. Return just the 3 captions, one per line.`,
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
    if (kind === "reel" && items.length === 0) {
      toast.error("Choose a video for your reel.");
      return;
    }
    if (kind === "post" && items.length === 0) {
      toast.error("Add at least one photo.");
      return;
    }
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("caption", caption);
    fd.set("location", location);
    fd.set("visibility", visibility);
    if (kind === "story" && textStory) fd.set("textStyle", "gradient");
    items.forEach((it) => fd.append("media", it.file));
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
        <div className="flex shrink-0 items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="card-title text-lg font-bold">{titles[kind]}</h2>
            <p className="text-faint text-xs">Publishing as <span className="font-semibold text-sage">{petName}</span></p>
          </div>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          ref={scrollRef}
          onFocus={(e) => {
            const t = e.target as HTMLElement;
            if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
              setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
            }
          }}
          className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        >
          {/* media */}
          {!(kind === "story" && textStory) && (
            <div>
              <input ref={fileRef} type="file" accept={accept} multiple={maxFiles > 1} className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
              {items.length === 0 ? (
                <button type="button" onClick={() => fileRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-white/16 bg-white/3 px-4 py-10 transition-colors hover:border-accent/40 hover:bg-accent/5">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/12 border border-accent/25">
                    <ImagePlus className="h-5.5 w-5.5 text-accent" />
                  </span>
                  <span className="text-sm font-semibold text-white/80">{kind === "reel" ? "Choose a vertical video" : kind === "story" ? "Choose a photo or video" : "Choose photos"}</span>
                  <span className="text-faint text-xs">{kind === "post" ? `Up to ${maxFiles} images · under 12MB each` : kind === "reel" ? "MP4/WebM · under 60MB · audio edits happen in your editor" : "Lives for 24 hours"}</span>
                </button>
              ) : (
                <div className={cn("grid gap-2", items.length > 1 ? "grid-cols-3" : "grid-cols-1")}>
                  {items.map((it, i) => (
                    <div key={i} className={cn("group relative overflow-hidden rounded-2xl border border-white/10 bg-black/40", it.file.type.startsWith("video") || kind === "reel" ? "aspect-[9/16]" : "aspect-square")}>
                      {it.file.type.startsWith("video/") ? (
                        <video src={it.preview} className="h-full w-full object-cover" controls muted playsInline />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={it.preview} alt="" className="h-full w-full object-cover" />
                      )}
                      {it.edited && (
                        <span className="on-dark absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-white/90 backdrop-blur-sm">Adjusted</span>
                      )}
                      <div className="absolute right-2 top-2 flex gap-1.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                        {it.original.type.startsWith("image/") && (
                          <button type="button" onClick={() => startEditing(i)} className="on-dark flex h-7 items-center gap-1 rounded-full bg-black/60 px-2.5 text-[11px] font-bold text-white/90 backdrop-blur-sm transition-colors hover:bg-black/80" aria-label="Adjust photo">
                            <Crop className="h-3.5 w-3.5" /> Adjust
                          </button>
                        )}
                        <button type="button" onClick={() => removeItem(i)} className="on-dark flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/80" aria-label="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {it.edited && (
                        <button type="button" onClick={() => revertEdit(i)} className="on-dark absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-full bg-black/60 px-2.5 text-[11px] font-bold text-white/90 opacity-100 backdrop-blur-sm transition-opacity hover:bg-black/80 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Revert to original">
                          <Undo2 className="h-3.5 w-3.5" /> Original
                        </button>
                      )}
                    </div>
                  ))}
                  {kind === "post" && items.length < maxFiles && (
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex aspect-square items-center justify-center rounded-2xl border border-dashed border-white/16 bg-white/3 transition-colors hover:border-accent/40">
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
              <button type="button" onClick={() => { setTextStory(true); clearItems(); }} className="chip flex-1 justify-center !py-2" data-active={textStory}><Type className="h-3.5 w-3.5" /> Text story</button>
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
                <button type="button" onClick={aiSuggestCaption} disabled={aiHelping} className="flex items-center gap-1 text-[11px] font-semibold text-accent transition-opacity hover:opacity-80 disabled:opacity-50">
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
                <input value={location} onChange={(e) => setLocation(e.target.value)} className="field !pl-10" placeholder="City / place" maxLength={60} autoComplete="address-level2" enterKeyHint="next" />
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button type="button" onClick={() => setVisibility("public")} className="chip justify-center !py-2.5" data-active={visibility === "public"}><Globe className="h-3.5 w-3.5" /> Public</button>
                <button type="button" onClick={() => setVisibility("followers")} className="chip justify-center !py-2.5" data-active={visibility === "followers"}><Users className="h-3.5 w-3.5" /> Followers</button>
              </div>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-white/7 px-4 py-4 sm:px-5 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <button onClick={onClose} className="btn-ghost text-sm">Cancel</button>
          <button onClick={publish} disabled={pending} className="btn-primary text-sm">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : kind === "story" ? "Share story" : "Publish"}
          </button>
        </div>
      </div>

      {editing && (
        <ImageEditor
          src={editing.src}
          title={kind === "story" ? "Adjust story photo" : "Adjust photo"}
          aspects={kind === "story" ? STORY_ASPECTS : POST_ASPECTS}
          outputSize={1600}
          onConfirm={confirmEdit}
          onCancel={() => {
            URL.revokeObjectURL(editing.src);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
