"use client";

import { useState } from "react";
import { Grid3X3, Clapperboard, AtSign, Bookmark, Lock, Feather } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedPost, PetLite } from "@/lib/queries";
import { PostCard } from "@/components/feed";
import { EmptyState } from "@/components/ui";
import Link from "next/link";

type Tab = "posts" | "reels" | "tagged" | "saved";

export function ProfileTabs({
  posts,
  reels,
  tagged,
  saved,
  me,
  meOwner,
  viewerOwns,
  name,
}: {
  posts: FeedPost[];
  reels: FeedPost[];
  tagged: FeedPost[];
  saved: FeedPost[];
  me: PetLite;
  meOwner: string;
  viewerOwns: boolean;
  name: string;
}) {
  const [tab, setTab] = useState<Tab>("posts");
  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }>; show: boolean }[] = [
    { id: "posts", label: "Posts", icon: Grid3X3, show: true },
    { id: "reels", label: "Reels", icon: Clapperboard, show: true },
    { id: "tagged", label: "Tagged", icon: AtSign, show: true },
    { id: "saved", label: "Saved", icon: Bookmark, show: viewerOwns },
  ];

  const data: Record<Tab, FeedPost[]> = { posts, reels, tagged, saved };
  const empties: Record<Tab, { title: string; body: string }> = {
    posts: { title: viewerOwns ? "Your first memory is waiting" : "No posts yet", body: viewerOwns ? `Share ${name}'s first photo moment with the + button.` : `${name} hasn't shared any posts yet.` },
    reels: { title: "No reels yet", body: viewerOwns ? "Vertical video moments will live here." : `${name} hasn't made any reels yet.` },
    tagged: { title: "No tags yet", body: `When pets mention @${name} in their posts, they'll appear here.` },
    saved: { title: "Nothing saved yet", body: "Save something worth coming back to — it's private to you." },
  };

  return (
    <div>
      <div className="glass sticky top-[4.4rem] z-30 mb-4 flex gap-1 rounded-2xl p-1 sm:top-[4.9rem]">
        {tabs.filter((t) => t.show).map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold transition-all sm:text-sm",
              tab === t.id ? "bg-accent/15 text-accent shadow-[0_6px_20px_-6px_rgba(143,185,220,0.45)]" : "text-white/50 hover:bg-white/5 hover:text-white/85",
            )}>
            <t.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {data[tab].length === 0 ? (
        <EmptyState icon={tab === "saved" ? Bookmark : Feather} title={empties[tab].title} body={empties[tab].body} />
      ) : (
        <div className="mx-auto max-w-xl space-y-5">
          {data[tab].map((post) => <PostCard key={post.id} post={post} me={me} meOwner={meOwner} />)}
        </div>
      )}
    </div>
  );
}

export function PrivateProfileGate({ children }: { children?: React.ReactNode }) {
  return (
    <div className="glass glass-sheen animate-rise flex flex-col items-center rounded-[28px] px-6 py-14 text-center">
      <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/6 border border-white/12">
        <Lock className="h-6 w-6 text-white/60" />
      </span>
      <h3 className="card-title text-lg font-bold text-white/92">This profile is private</h3>
      <p className="text-dim mt-1.5 max-w-xs text-sm leading-relaxed">Send a follow request — once accepted, their posts, reels and stories will open up.</p>
      {children}
    </div>
  );
}
