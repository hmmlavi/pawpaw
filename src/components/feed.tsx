"use client";

import { Fragment, useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, Send, Bookmark, Repeat2, MoreHorizontal, MapPin, Trash2,
  Pencil, Ban, Flag, X, Loader2, ChevronLeft, ChevronRight, Sparkles, Plus, Check,
} from "lucide-react";
import { cn, formatCount, timeAgo, isBirthdayToday } from "@/lib/utils";
import type { FeedPost, PetLite, StoryGroup } from "@/lib/queries";
import { PetAvatar, OwnerAvatar } from "@/components/ui";
import { IdentityBadge, StarBadge, BirthdayBadge } from "@/components/pet-identity";
import {
  toggleLikeAction, toggleSaveAction, toggleRepostAction, addCommentAction,
  deleteCommentAction, toggleCommentLikeAction, deletePostAction, updatePostCaptionAction, followAction,
  toggleBlockAction, reportAction,
} from "@/actions/content";
import type { CommentWithMeta } from "@/actions/content";
import { openConversationAction, sendMessageAction } from "@/actions/messages";
import { searchPetsAction } from "@/actions/pets";
import { Composer } from "@/components/composer";
import { toast } from "sonner";

/* ─── Author row ─────────────────────────────── */

export function AuthorRow({ pet, size = "md", sub, href = true }: { pet: PetLite; size?: "sm" | "md"; sub?: string | null; href?: boolean }) {
  const inner = (
    <span className="flex min-w-0 items-center gap-2.5">
      <PetAvatar avatarFileId={pet.avatar ? pet.avatar.replace("/api/file/", "") : null} name={pet.name} icon={pet.icon} size={size === "sm" ? "sm" : "md"} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-white/92">{pet.name}</span>
          <IdentityBadge icon={pet.icon} size="sm" />
          {pet.starBadge && <StarBadge />}
          {isBirthdayToday(pet.birthday) && <BirthdayBadge />}
        </span>
        <span className="text-faint block truncate text-xs">{sub ?? `@${pet.username}`}</span>
      </span>
    </span>
  );
  return href ? <Link href={`/profile/${pet.username}`} className="min-w-0 transition-opacity hover:opacity-80">{inner}</Link> : inner;
}

/* ─── Caption renderer (hashtags/mentions) ───── */

export function RichText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+|@[a-zA-Z0-9_.]+)/gu);
  return (
    <p className={cn("whitespace-pre-wrap break-words", className)}>
      {parts.map((part, i) => {
        if (part.startsWith("#")) {
          return <Link key={i} href={`/search?q=${encodeURIComponent(part)}&tab=content`} className="font-semibold text-sky/90 hover:text-sky transition-colors">{part}</Link>;
        }
        if (part.startsWith("@")) {
          return <Link key={i} href={`/profile/${part.slice(1).toLowerCase()}`} className="font-semibold text-accent hover:text-accent/80 transition-colors">{part}</Link>;
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
}

/* ─── Send/share sheet ───────────────────────── */

function SendSheet({ post, onClose }: { post: FeedPost; onClose: () => void }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchPetsAction>>>([]);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(async () => {
      if (q.trim().length < 1) { setResults([]); return; }
      setResults(await searchPetsAction(q));
    }, 280);
    return () => clearTimeout(t.current);
  }, [q]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${location.origin}/profile/${post.author.username}?post=${post.id}`);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy link.");
    }
  };

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center animate-fade" onClick={onClose}>
      <div className="glass-deep w-full max-w-md rounded-[24px] p-4 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between px-1">
          <h3 className="card-title text-base font-bold">Send to</h3>
          <button onClick={onClose} className="glass-hair flex h-7 w-7 items-center justify-center rounded-lg" aria-label="Close"><X className="h-3.5 w-3.5" /></button>
        </div>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pets to message…" className="field" autoFocus />
        <div className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">
          {results.map((p) => (
            <div key={p.id} className="flex items-center gap-2.5 rounded-xl px-2 py-2">
              <PetAvatar avatarFileId={p.avatar ? p.avatar.replace("/api/file/", "") : null} name={p.name} icon={p.animalType} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white/90">{p.name}</p>
                <p className="text-faint truncate text-xs">@{p.username}</p>
              </div>
              <button
                disabled={pending || sent.has(p.id)}
                onClick={() => start(async () => {
                  const conv = await openConversationAction(p.id);
                  if (!conv.conversationId) { toast.error(conv.error ?? "Could not open chat."); return; }
                  const fd = new FormData();
                  fd.set("conversationId", conv.conversationId);
                  fd.set("postShareId", post.id);
                  fd.set("text", "");
                  const res = await sendMessageAction(fd);
                  if (res.ok) {
                    setSent((s) => new Set(s).add(p.id));
                    toast.success(`Sent to ${p.name}.`);
                  } else toast.error(res.error ?? "Could not send.");
                })}
                className={cn("btn-ghost !px-3 !py-1.5 text-xs", sent.has(p.id) && "!border-accent/40 !text-accent")}
              >
                {sent.has(p.id) ? <Check className="h-3.5 w-3.5" /> : "Send"}
              </button>
            </div>
          ))}
          {q.trim().length > 0 && results.length === 0 && <p className="text-faint py-4 text-center text-xs">No pets found for “{q}”.</p>}
          {q.trim().length === 0 && <p className="text-faint py-4 text-center text-xs">Find a pet to share this with, or copy the link.</p>}
        </div>
        <div className="divider my-2" />
        <button onClick={copyLink} className="btn-ghost w-full text-sm">Copy link</button>
      </div>
    </div>
  );
}

/* ─── Report sheet ───────────────────────────── */

export function ReportSheet({ targetType, targetId, onClose }: { targetType: string; targetId: string; onClose: () => void }) {
  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [pending, start] = useTransition();
  const CATS = ["Spam", "Harassment", "Abuse", "Fake account", "Scam", "Dangerous content", "Animal cruelty", "Misleading information", "Other"];
  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center animate-fade" onClick={onClose}>
      <div className="glass-deep w-full max-w-md rounded-[24px] p-5 animate-scale-in" onClick={(e) => e.stopPropagation()} >
        <h3 className="card-title text-base font-bold">Report {targetType}</h3>
        <p className="text-faint mt-1 text-xs">Reports are reviewed confidentially. Animal cruelty is treated with priority.</p>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {CATS.map((c) => <button key={c} className="chip" data-active={category === c} onClick={() => setCategory(c)}>{c}</button>)}
        </div>
        <textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={3} maxLength={500} className="field mt-3 resize-none" placeholder="Anything else we should know? (optional)" />
        <div className="mt-4 flex justify-end gap-2">
          <button className="btn-ghost text-sm" onClick={onClose}>Cancel</button>
          <button className="btn-primary text-sm" disabled={!category || pending}
            onClick={() => start(async () => {
              const res = await reportAction(targetType, targetId, category, details);
              if (res.ok) { toast.success("Report received. Thank you for keeping the community safe."); onClose(); }
              else toast.error(res.error ?? "Could not submit report.");
            })}>
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit report"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Comments ───────────────────────────────── */

export function CommentsPanel({ postId, me, meOwner, onCountChange }: { postId: string; me: PetLite; meOwner: string; onCountChange: (n: number) => void }) {
  const [comments, setComments] = useState<CommentWithMeta[] | null>(null);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentWithMeta | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let alive = true;
    import("@/actions/content").then((m) => m.getCommentsAction(postId)).then((rows) => {
      if (alive) setComments(rows);
    }).catch(() => alive && setComments([]));
    return () => { alive = false; };
  }, [postId]);

  const list = comments ?? [];
  const roots = list.filter((c) => !c.parentId);
  const replies = (id: string) => list.filter((c) => c.parentId === id);

  const submit = () => {
    if (!text.trim()) return;
    start(async () => {
      const res = await addCommentAction(postId, text, replyTo?.id);
      if (res.ok) {
        const optimistic: CommentWithMeta = {
          id: crypto.randomUUID(), text: text.trim(), parentId: replyTo?.id ?? null, createdAt: new Date().toISOString(),
          likeCount: 0, viewerLiked: false, ownerName: meOwner, author: me,
        };
        setComments((c) => [...(c ?? []), optimistic]);
        onCountChange(list.length + 1);
        setText(""); setReplyTo(null);
      } else toast.error(res.error ?? "Could not comment.");
    });
  };

  const toggleLike = (c: CommentWithMeta) => {
    const next = !c.viewerLiked;
    setComments((prev) => (prev ?? []).map((x) =>
      x.id === c.id ? { ...x, viewerLiked: next, likeCount: x.likeCount + (next ? 1 : -1) } : x,
    ));
    start(async () => {
      try {
        const res = await toggleCommentLikeAction(c.id);
        setComments((prev) => (prev ?? []).map((x) =>
          x.id === c.id ? { ...x, viewerLiked: res.liked, likeCount: res.likeCount } : x,
        ));
      } catch {
        setComments((prev) => (prev ?? []).map((x) => (x.id === c.id ? c : x)));
        toast.error("Couldn't update like.");
      }
    });
  };

  const renderItem = (c: CommentWithMeta, isReply?: boolean) => (
    <div className={cn("group flex gap-2.5", isReply && "ml-10")}>
      <Link href={`/profile/${c.author.username}`} title={`@${c.author.username}`} className="shrink-0 transition-opacity hover:opacity-80">
        <OwnerAvatar name={c.ownerName} size="xs" />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="glass-hair inline-block max-w-full rounded-2xl px-3 py-2">
          <Link
            href={`/profile/${c.author.username}`}
            title={`@${c.author.username}`}
            className="text-xs font-bold text-white/90 hover:text-accent transition-colors"
          >
            {c.ownerName}
          </Link>
          <RichText text={c.text} className="text-[13px] text-white/80" />
        </div>
        <div className="mt-1 flex items-center gap-3 pl-1">
          <span className="text-faint text-[11px]">{timeAgo(c.createdAt)}</span>
          <button
            onClick={() => toggleLike(c)}
            aria-label={c.viewerLiked ? "Unlike comment" : "Like comment"}
            aria-pressed={c.viewerLiked}
            className={cn(
              "flex items-center gap-1 text-[11px] font-bold transition-all active:scale-90",
              c.viewerLiked ? "text-clay" : "text-faint hover:text-white/70",
            )}
          >
            <Heart className={cn("h-3.5 w-3.5 transition-all", c.viewerLiked && "fill-clay")} />
            {c.likeCount > 0 && <span className="tabular-nums">{formatCount(c.likeCount)}</span>}
            <span className="sr-only">Like</span>
          </button>
          {!isReply && <button className="text-faint hover:text-white/70 text-[11px] font-semibold transition-colors" onClick={() => setReplyTo(c)}>Reply</button>}
          {c.author.id === me.id && (
            <button className="text-faint hover:text-clay text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-100"
              onClick={() => start(async () => {
                const res = await deleteCommentAction(c.id);
                if (res.ok) { setComments((prev) => (prev ?? []).filter((x) => x.id !== c.id)); onCountChange(list.length - 1); }
              })}>Delete</button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
        {comments === null && (
          <div className="space-y-2.5 py-1">
            <div className="skeleton h-9 w-3/4" /><div className="skeleton h-9 w-1/2" />
          </div>
        )}
        {comments !== null && roots.length === 0 && <p className="text-faint py-3 text-center text-xs">No comments yet — start the conversation.</p>}
        {roots.map((c) => (
          <div key={c.id} className="space-y-2.5">
            {renderItem(c)}
            {replies(c.id).map((r) => <Fragment key={r.id}>{renderItem(r, true)}</Fragment>)}
          </div>
        ))}
      </div>
      <div className="mt-3">
        {replyTo && (
          <div className="mb-1.5 flex items-center justify-between rounded-lg bg-accent/10 px-2.5 py-1.5 text-[11px] text-accent">
            Replying to {replyTo.ownerName}
            <button onClick={() => setReplyTo(null)} aria-label="Cancel reply"><X className="h-3 w-3" /></button>
          </div>
        )}
        <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
          <input value={text} onChange={(e) => setText(e.target.value)} className="field !py-2.5 text-sm" placeholder={`Comment as ${meOwner}…`} maxLength={500} enterKeyHint="send" />
          <button type="submit" disabled={pending || !text.trim()} className="btn-primary !rounded-xl !p-2.5" aria-label="Send comment">
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─── Post card ──────────────────────────────── */

export function PostCard({ post, me, meOwner }: { post: FeedPost; me: PetLite; meOwner: string }) {
  const router = useRouter();
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likes, setLikes] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.viewerSaved);
  const [reposted, setReposted] = useState(post.viewerReposted);
  const [reposts, setReposts] = useState(post.repostCount);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount);
  const [mediaIndex, setMediaIndex] = useState(0);
  const [burst, setBurst] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption);
  const [caption, setCaption] = useState(post.caption);
  const [followState, setFollowState] = useState<string>(post.viewerOwns ? "own" : post.viewerFollowState);
  const [reporting, setReporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [, start] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const like = () => {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    if (next) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    start(async () => {
      try { const res = await toggleLikeAction(post.id); setLiked(res.liked); }
      catch { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); toast.error("Couldn't update like."); }
    });
  };

  if (deleted) return null;

  return (
    <article className="glass glass-sheen animate-rise overflow-hidden rounded-[26px]">
      {/* header */}
      <div className="flex items-center gap-2 px-4 pt-3.5 pb-3">
        <AuthorRow pet={post.author} sub={`@${post.author.username}${post.location ? ` · ${post.location}` : ""}`} />
        {post.nearbyTag && <span className="chip !cursor-default !py-1 text-sky/80 border-sky/30 bg-sky/10 text-[10px]">Discover</span>}
        <div className="ml-auto flex items-center gap-1">
          {followState !== null && followState !== "own" && (
            <button className="btn-ghost !px-3 !py-1.5 text-xs"
              onClick={() => start(async () => {
                const res = await followAction(post.author.id);
                setFollowState(res.state);
              })}>
              {followState === "following" ? "Following" : followState === "requested" ? "Requested" : "Follow"}
            </button>
          )}
          <span className="text-faint text-xs">{timeAgo(post.createdAt)}</span>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((v) => !v)} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="Post options">
              <MoreHorizontal className="h-4 w-4 text-white/70" />
            </button>
            {menuOpen && (
              <div className="glass-deep absolute right-0 top-9 z-20 w-52 animate-scale-in rounded-2xl p-1.5 origin-top-right">
                {post.viewerOwns ? (
                  <>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 hover:bg-white/8 transition-colors" onClick={() => { setEditing(true); setMenuOpen(false); }}>
                      <Pencil className="h-4 w-4" /> Edit caption
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-clay hover:bg-clay/10 transition-colors"
                      onClick={() => { setMenuOpen(false); if (confirm("Delete this post? This can't be undone.")) { setDeleted(true); start(async () => { const r = await deletePostAction(post.id); if (!r.ok) { setDeleted(false); toast.error(r.error); } else toast.success("Post deleted."); }); } }}>
                      <Trash2 className="h-4 w-4" /> Delete post
                    </button>
                  </>
                ) : (
                  <>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 hover:bg-white/8 transition-colors"
                      onClick={() => { setMenuOpen(false); start(async () => { const r = await toggleBlockAction(post.author.id); toast.success(r.blocked ? `${post.author.name} blocked.` : `${post.author.name} unblocked.`); if (r.blocked) router.refresh(); }); }}>
                      <Ban className="h-4 w-4" /> Block @{post.author.username}
                    </button>
                    <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 hover:bg-white/8 transition-colors" onClick={() => { setMenuOpen(false); setReporting(true); }}>
                      <Flag className="h-4 w-4" /> Report post
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* media */}
      {post.media.length > 0 && (
        <div className="on-dark relative select-none" onDoubleClick={like} role="button" aria-label="Like" tabIndex={0}>
          <div className={cn("relative overflow-hidden bg-black/40", post.kind === "reel" ? "aspect-[4/5]" : "aspect-square sm:aspect-[4/3]")}>
            <MediaItem key={mediaIndex} url={post.media[mediaIndex].url} />
            {burst && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <Heart className="like-burst h-24 w-24 fill-white text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
              </span>
            )}
          </div>
          {post.media.length > 1 && (
            <>
              <div className="absolute right-3 top-3 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white/90 backdrop-blur-sm">{mediaIndex + 1}/{post.media.length}</div>
              {mediaIndex > 0 && (
                <button onClick={() => setMediaIndex((i) => i - 1)} className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform hover:scale-110" aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </button>
              )}
              {mediaIndex < post.media.length - 1 && (
                <button onClick={() => setMediaIndex((i) => i + 1)} className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-md transition-transform hover:scale-110" aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
              <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1">
                {post.media.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full transition-all", i === mediaIndex ? "w-4 bg-white" : "w-1.5 bg-white/40")} />)}
              </div>
            </>
          )}
        </div>
      )}

      {/* actions */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-1">
          <button onClick={like} className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/6" aria-label="Like">
            <Heart className={cn("h-5.5 w-5.5 transition-all duration-300 group-active:scale-75", liked ? "fill-clay text-clay scale-110" : "text-white/75 group-hover:text-white")} />
            <span className={cn("text-sm font-bold tabular-nums", liked ? "text-clay" : "text-white/75")}>{formatCount(likes)}</span>
          </button>
          <button onClick={() => setShowComments((v) => !v)} className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/6" aria-label="Comments">
            <MessageCircle className="h-5.5 w-5.5 text-white/75 transition-colors group-hover:text-white" />
            <span className="text-sm font-bold tabular-nums text-white/75">{formatCount(commentCount)}</span>
          </button>
          <button onClick={() => setSending(true)} className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/6" aria-label="Send">
            <Send className="h-5.5 w-5.5 text-white/75 transition-colors group-hover:text-white" />
          </button>
          <button
            onClick={() => { const next = !reposted; setReposted(next); setReposts((n) => n + (next ? 1 : -1)); start(async () => { try { const r = await toggleRepostAction(post.id); setReposted(r.reposted); if (r.reposted) toast.success("Reposted to your profile narrative."); } catch { setReposted(!next); setReposts((n) => n + (next ? -1 : 1)); } }); }}
            className="group flex items-center gap-1.5 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/6" aria-label="Repost">
            <Repeat2 className={cn("h-5.5 w-5.5 transition-all group-active:scale-75", reposted ? "text-accent" : "text-white/75 group-hover:text-white")} />
            <span className={cn("text-sm font-bold tabular-nums", reposted ? "text-accent" : "text-white/75")}>{formatCount(reposts)}</span>
          </button>
          <button
            onClick={() => { const next = !saved; setSaved(next); start(async () => { try { const r = await toggleSaveAction(post.id); setSaved(r.saved); toast.success(r.saved ? "Saved." : "Removed from saved."); } catch { setSaved(!next); } }); }}
            className="ml-auto flex items-center rounded-xl px-2 py-1.5 transition-colors hover:bg-white/6" aria-label="Save">
            <Bookmark className={cn("h-5.5 w-5.5 transition-all group-active:scale-75", saved ? "fill-sand text-sand" : "text-white/75 hover:text-white")} />
          </button>
        </div>

        {/* caption */}
        <div className="pb-4 pt-2">
          {editing ? (
            <div className="space-y-2 animate-fade">
              <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)} rows={3} maxLength={1200} className="field resize-none text-sm" />
              <div className="flex gap-2">
                <button className="btn-primary !px-3.5 !py-1.5 text-xs" onClick={() => start(async () => {
                  const res = await updatePostCaptionAction(post.id, editCaption);
                  if (res.ok) { setCaption(editCaption.trim()); setEditing(false); toast.success("Caption updated."); }
                  else toast.error(res.error ?? "Could not update.");
                })}>Save</button>
                <button className="btn-ghost !px-3.5 !py-1.5 text-xs" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          ) : caption ? (
            <div className="text-sm leading-relaxed text-white/85">
              <Link href={`/profile/${post.author.username}`} className="mr-1.5 inline-block font-bold text-white/95 hover:text-accent transition-colors">{post.author.name}</Link>
              <RichText text={caption} className="inline" />
            </div>
          ) : null}
          {commentCount > 0 && !showComments && (
            <button onClick={() => setShowComments(true)} className="text-faint hover:text-white/60 mt-1.5 text-[13px] transition-colors">
              View {commentCount === 1 ? "1 comment" : `all ${formatCount(commentCount)} comments`}
            </button>
          )}
        </div>

        {showComments && (
          <div className="border-t border-white/7 pb-4 pt-3 animate-fade">
            <CommentsPanel postId={post.id} me={me} meOwner={meOwner} onCountChange={setCommentCount} />
          </div>
        )}
      </div>

      {reporting && <ReportSheet targetType="post" targetId={post.id} onClose={() => setReporting(false)} />}
      {sending && <SendSheet post={post} onClose={() => setSending(false)} />}
    </article>
  );
}

export function MediaItem({ url }: { url: string }) {
  const [isVideo, setIsVideo] = useState<boolean | null>(null);
  if (isVideo === false) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="h-full w-full object-cover animate-fade" />;
  }
  const video = (
    <video
      src={url}
      className={cn("h-full w-full object-cover animate-fade", isVideo === null && "opacity-0")}
      controls={isVideo === true}
      playsInline
      preload="metadata"
      onLoadedMetadata={(e) => {
        const v = e.currentTarget;
        setIsVideo(v.videoWidth > 0);
      }}
      onError={() => setIsVideo(false)}
    />
  );
  return video;
}

/* ─── Stories rail + viewer ──────────────────── */

export function StoriesRail({ groups, me, city }: { groups: StoryGroup[]; me: PetLite; city: string }) {
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  return (
    <div className="no-scrollbar -mx-3 flex gap-3.5 overflow-x-auto px-3 pb-1 pt-1 sm:-mx-1 sm:px-1">
      <button onClick={() => setCreateOpen(true)} className="group flex w-17 shrink-0 flex-col items-center gap-1.5">
        <span className="story-ring-seen relative transition-transform duration-300 group-hover:scale-105">
          <PetAvatar avatarFileId={me.avatar ? me.avatar.replace("/api/file/", "") : null} name={me.name} icon={me.icon} size="lg" />
          <span className="absolute bottom-0 right-0 flex h-5.5 w-5.5 items-center justify-center rounded-full bg-accent text-on-accent shadow-md ring-2 ring-ink">
            <Plus className="h-3 w-3" strokeWidth={3} />
          </span>
        </span>
        <span className="text-[11px] font-medium text-white/60">Your story</span>
      </button>
      {groups.filter((g) => !g.isOwn).map((g, i) => (
        <button key={g.author.id} onClick={() => setOpenGroup(i)} className="group flex w-17 shrink-0 flex-col items-center gap-1.5">
          <span className={cn(isBirthdayToday(g.author.birthday) ? "story-ring-bday" : "story-ring", "transition-transform duration-300 group-hover:scale-105")}>
            <PetAvatar avatarFileId={g.author.avatar ? g.author.avatar.replace("/api/file/", "") : null} name={g.author.name} icon={g.author.icon} size="lg" className="ring-2 ring-ink" />
          </span>
          <span className="w-full truncate text-[11px] font-medium text-white/70">{g.author.name}</span>
        </button>
      ))}
      {groups.filter((g) => !g.isOwn).length === 0 && (
        <div className="glass-hair flex min-w-40 items-center gap-2.5 rounded-2xl px-4 py-2.5">
          <Sparkles className="h-4 w-4 shrink-0 text-sky/70" />
          <p className="text-faint text-[11px] leading-snug">Stories from pets you follow will appear here.</p>
        </div>
      )}
      {openGroup !== null && <StoryViewer group={groups.filter((g) => !g.isOwn)[openGroup]} onClose={() => setOpenGroup(null)} />}
      {createOpen && <Composer kind="story" petName={me.name} city={city} onClose={() => setCreateOpen(false)} />}
    </div>
  );
}

function StoryViewer({ group, onClose }: { group: StoryGroup; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [reacting, setReacting] = useState<string | null>(null);
  const story = group.stories[index];
  const DURATION = 5000;

  useEffect(() => {
    setProgress(0);
    const start = Date.now();
    const timer = setInterval(() => {
      const p = (Date.now() - start) / DURATION;
      if (p >= 1) {
        clearInterval(timer);
        if (index < group.stories.length - 1) setIndex((i) => i + 1);
        else onClose();
      } else setProgress(p);
    }, 50);
    return () => clearInterval(timer);
  }, [index, group.stories.length, onClose]);

  const REACTIONS = ["❤️", "😂", "😮", "👏", "🥹", "🔥"];

  return (
    <div className="modal-veil fixed inset-0 z-[60] flex items-center justify-center p-0 sm:p-6 animate-fade" onClick={onClose}>
      <div className="on-dark relative flex h-full w-full max-w-sm flex-col overflow-hidden bg-black sm:h-[86dvh] sm:rounded-[26px] sm:border sm:border-white/10 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        {/* progress */}
        <div className="absolute inset-x-3 top-3 z-20 flex gap-1">
          {group.stories.map((_, i) => (
            <div key={i} className="h-[3px] flex-1 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white transition-none" style={{ width: i < index ? "100%" : i === index ? `${progress * 100}%` : "0%" }} />
            </div>
          ))}
        </div>
        {/* header */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center gap-2.5 bg-gradient-to-b from-black/70 to-transparent px-4 pb-8 pt-6">
          <PetAvatar avatarFileId={group.author.avatar ? group.author.avatar.replace("/api/file/", "") : null} name={group.author.name} icon={group.author.icon} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{group.author.name}</p>
            <p className="text-[11px] text-white/60">{timeAgo(story.createdAt)}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/90 transition-colors hover:bg-black/70" aria-label="Close story">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* content */}
        <div className="relative flex-1">
          {story.url ? (
            <StoryMedia url={story.url} />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-sage/30 via-[#17181d] to-sky/25 p-8">
              <p className="text-center font-display text-xl font-semibold leading-relaxed text-white">{story.caption}</p>
            </div>
          )}
          {story.url && story.caption && !story.textStyle && (
            <div className="absolute inset-x-0 bottom-16 z-10 px-5 pb-2">
              <p className="rounded-2xl bg-black/45 px-4 py-3 text-sm text-white/95 backdrop-blur-md">{story.caption}</p>
            </div>
          )}
          {/* tap zones */}
          <button className="absolute inset-y-0 left-0 z-10 w-1/3" onClick={() => index > 0 && setIndex((i) => i - 1)} aria-label="Previous story" />
          <button className="absolute inset-y-0 right-0 z-10 w-1/3" onClick={() => (index < group.stories.length - 1 ? setIndex((i) => i + 1) : onClose())} aria-label="Next story" />
        </div>

        {/* reactions */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-5 pt-8">
          {REACTIONS.map((r) => (
            <button key={r} onClick={() => { setReacting(r); setTimeout(() => setReacting(null), 800); toast.success(`Sent ${r} to ${group.author.name}`); }}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg backdrop-blur-md transition-all duration-200 hover:scale-125 hover:bg-white/20 active:scale-95">
              {r}
            </button>
          ))}
          {reacting && <span className="like-burst pointer-events-none absolute bottom-16 text-4xl">{reacting}</span>}
        </div>
      </div>
    </div>
  );
}

function StoryMedia({ url }: { url: string }) {
  return <MediaItem url={url} />;
}
