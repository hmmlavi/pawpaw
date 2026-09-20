"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Heart, MessageCircle, Send, Bookmark, Music2, Clapperboard, Volume2, VolumeX } from "lucide-react";
import { cn, formatCount, timeAgo } from "@/lib/utils";
import type { FeedPost, PetLite } from "@/lib/queries";
import { AuthorRow, RichText } from "@/components/feed";
import { toggleLikeAction, toggleSaveAction, followAction } from "@/actions/content";
import { EmptyState } from "@/components/ui";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function ReelSlide({ post, me, active }: { post: FeedPost; me: PetLite; active: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(post.viewerLiked);
  const [likes, setLikes] = useState(post.likeCount);
  const [saved, setSaved] = useState(post.viewerSaved);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [follow, setFollow] = useState<"none" | "following" | "requested">(post.viewerFollowState === "following" && post.viewerOwns ? "none" : post.viewerFollowState);
  const [burst, setBurst] = useState(false);
  const [, start] = useTransition();
  const router = useRouter();

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) { v.play().catch(() => setPlaying(false)); }
    else { v.pause(); v.currentTime = 0; }
  }, [active]);

  const isVideo = post.media[0]?.url ? true : false;

  const like = () => {
    const next = !liked;
    setLiked(next); setLikes((n) => n + (next ? 1 : -1));
    if (next) { setBurst(true); setTimeout(() => setBurst(false), 700); }
    start(async () => { try { const r = await toggleLikeAction(post.id); setLiked(r.liked); } catch { setLiked(!next); setLikes((n) => n + (next ? -1 : 1)); } });
  };

  return (
    <div className="relative flex h-full items-center justify-center">
      <div className="on-dark relative h-full max-h-full w-full overflow-hidden bg-black sm:h-auto sm:max-h-[82dvh] sm:aspect-[9/16] sm:w-auto sm:rounded-[26px] sm:border sm:border-white/10">
        {isVideo ? (
          <video
            ref={videoRef}
            src={post.media[0].url}
            className="h-full w-full object-contain sm:object-cover"
            loop
            playsInline
            muted={muted}
            onClick={() => { const v = videoRef.current; if (!v) return; if (v.paused) { v.play(); setPlaying(true); } else { v.pause(); setPlaying(false); } }}
            onDoubleClick={like}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={post.media[0]?.url ?? ""} alt="" className="h-full w-full object-contain" />
        )}

        {burst && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Heart className="like-burst h-28 w-28 fill-white text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.55)]" />
          </span>
        )}
        {!playing && active && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/45 backdrop-blur-md">
              <Clapperboard className="h-6 w-6 text-white/90" />
            </span>
          </span>
        )}

        <button onClick={() => setMuted((m) => !m)} className="absolute right-3.5 top-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white/90 backdrop-blur-md transition-colors hover:bg-black/65" aria-label="Toggle sound">
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>

        {/* overlay info */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/35 to-transparent px-4 pb-5 pt-16">
          <div className="flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <AuthorRow pet={post.author} size="sm" sub={post.location ?? undefined} />
                {!post.viewerOwns && follow !== "following" && (
                  <button
                    onClick={() => start(async () => { const r = await followAction(post.author.id); setFollow(r.state); if (r.state === "requested") toast.success("Follow request sent."); })}
                    className="rounded-lg border border-white/35 bg-white/10 px-2.5 py-1 text-[11px] font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20">
                    {follow === "requested" ? "Requested" : "Follow"}
                  </button>
                )}
              </div>
              {post.caption && <RichText text={post.caption} className="mt-2 line-clamp-2 max-w-[52ch] text-[13px] leading-snug text-white/90" />}
              {post.caption.match(/#[\p{L}\p{N}_]+/u) && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-white/55">
                  <Music2 className="h-3 w-3 shrink-0" /> Original audio — added by {post.author.name}
                </p>
              )}
              <p className="mt-1 text-[11px] text-white/45">{timeAgo(post.createdAt)}</p>
            </div>

            {/* action rail */}
            <div className="flex shrink-0 flex-col items-center gap-4 pb-1">
              <button onClick={like} className="group flex flex-col items-center gap-1" aria-label="Like">
                <Heart className={cn("h-7 w-7 transition-all group-active:scale-75", liked ? "fill-clay text-clay" : "text-white group-hover:scale-110")} />
                <span className="text-[11px] font-bold text-white/85 tabular-nums">{formatCount(likes)}</span>
              </button>
              <button onClick={() => router.push(`/profile/${post.author.username}`)} className="group flex flex-col items-center gap-1" aria-label="Comments on profile">
                <MessageCircle className="h-7 w-7 text-white transition-transform group-hover:scale-110" />
                <span className="text-[11px] font-bold text-white/85 tabular-nums">{formatCount(post.commentCount)}</span>
              </button>
              <button
                onClick={async () => {
                  try { await navigator.clipboard.writeText(`${location.origin}/profile/${post.author.username}`); toast.success("Link copied."); }
                  catch { toast.error("Couldn't copy link."); }
                }}
                className="group flex flex-col items-center gap-1" aria-label="Share">
                <Send className="h-7 w-7 text-white transition-transform group-hover:scale-110" />
              </button>
              <button
                onClick={() => { const next = !saved; setSaved(next); start(async () => { try { const r = await toggleSaveAction(post.id); setSaved(r.saved); toast.success(r.saved ? "Saved." : "Removed from saved."); } catch { setSaved(!next); } }); }}
                className="group flex flex-col items-center gap-1" aria-label="Save">
                <Bookmark className={cn("h-6.5 w-6.5 transition-all group-active:scale-75", saved ? "fill-sand text-sand" : "text-white group-hover:scale-110")} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function ReelsFeed({ reels, me }: { reels: FeedPost[]; me: PetLite }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const children = Array.from(node.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActiveIndex(children.indexOf(e.target as HTMLElement));
        });
      },
      { root: node, threshold: 0.65 },
    );
    children.forEach((c) => observer.observe(c));
    return () => observer.disconnect();
  }, [reels.length]);

  if (reels.length === 0) {
    return (
      <div className="pt-6">
        <EmptyState
          icon={Clapperboard}
          title="No reels yet"
          body="Vertical video moments from pets will play here. Share your pet's first reel with the + button."
        />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="snap-feed no-scrollbar h-[calc(100dvh-12.5rem)] snap-y snap-mandatory overflow-y-auto sm:h-[calc(100dvh-8rem)]">
      {reels.map((post, i) => (
        <div key={post.id} className="h-full">
          <ReelSlide post={post} me={me} active={i === activeIndex} />
        </div>
      ))}
    </div>
  );
}
