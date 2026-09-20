"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Heart, MessageCircle, AtSign, Repeat2, Send, CalendarHeart, UserPlus, Clock, Sparkles, Cake, Info,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import type { loadNotifications } from "@/lib/queries";
import { PetAvatar } from "@/components/ui";
import { markNotificationsReadAction } from "@/actions/content";

const ICONS: Record<string, { icon: React.ComponentType<{ className?: string }>; tint: string; bg: string }> = {
  follow: { icon: UserPlus, tint: "text-accent", bg: "bg-accent/15" },
  follow_request: { icon: Clock, tint: "text-sand", bg: "bg-sand/15" },
  follow_accept: { icon: UserPlus, tint: "text-accent", bg: "bg-accent/15" },
  like: { icon: Heart, tint: "text-clay", bg: "bg-clay/15" },
  comment: { icon: MessageCircle, tint: "text-sky", bg: "bg-sky/15" },
  mention: { icon: AtSign, tint: "text-accent", bg: "bg-accent/15" },
  repost: { icon: Repeat2, tint: "text-accent", bg: "bg-accent/15" },
  share: { icon: Send, tint: "text-sky", bg: "bg-sky/15" },
  message: { icon: Send, tint: "text-sky", bg: "bg-sky/15" },
  message_request: { icon: Clock, tint: "text-sand", bg: "bg-sand/15" },
  event: { icon: CalendarHeart, tint: "text-sand", bg: "bg-sand/15" },
  birthday: { icon: Cake, tint: "text-clay", bg: "bg-clay/15" },
  system: { icon: Info, tint: "text-white/70", bg: "bg-white/10" },
};

type Notif = Awaited<ReturnType<typeof loadNotifications>>[number];

function hrefFor(n: Notif): string {
  if (n.type === "message" || n.type === "message_request") return n.entityId ? `/messages?c=${n.entityId}` : "/messages";
  if (n.type === "event") return "/events";
  if (n.entityType === "pet" && n.actor) return `/profile/${n.actor.username}`;
  if (n.actor) return `/profile/${n.actor.username}`;
  return "/notifications";
}

let markedOnce = false;

export function NotificationsClient({ notification: n }: { notification: Notif }) {
  const router = useRouter();
  const cfg = ICONS[n.type] ?? ICONS.system;

  useEffect(() => {
    if (!markedOnce) {
      markedOnce = true;
      markNotificationsReadAction().then(() => router.refresh()).catch(() => {});
    }
  }, [router]);

  return (
    <Link
      href={hrefFor(n)}
      className={cn(
        "flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/5",
        !n.read && "bg-accent/6",
      )}
    >
      <span className="relative shrink-0">
        {n.actor ? (
          <PetAvatar avatarFileId={n.actor.avatar ? n.actor.avatar.replace("/api/file/", "") : null} name={n.actor.name} icon={n.actor.icon} size="md" />
        ) : (
          <span className={cn("flex h-11 w-11 items-center justify-center rounded-full", cfg.bg)}>
            <Sparkles className="h-4.5 w-4.5 text-white/70" />
          </span>
        )}
        <span className={cn("absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-ink-2", cfg.bg)}>
          <cfg.icon className={cn("h-2.5 w-2.5", cfg.tint)} />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm leading-snug text-white/85">{n.body}</span>
        <span className="text-faint mt-0.5 block text-[11px]">{timeAgo(n.createdAt)}</span>
      </span>
      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" />}
    </Link>
  );
}
