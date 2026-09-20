"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { followAction } from "@/actions/content";
import { UserPlus, Check, Clock } from "lucide-react";
import { toast } from "sonner";

export function FollowButton({
  targetId,
  initial = "none",
  compact = false,
  className,
}: {
  targetId: string;
  initial?: "none" | "following" | "requested";
  compact?: boolean;
  className?: string;
}) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => start(async () => {
        try {
          const res = await followAction(targetId);
          setState(res.state);
          if (res.state === "requested") toast.success("Follow request sent.");
        } catch {
          toast.error("Couldn't update follow.");
        }
      })}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl font-semibold transition-colors",
        compact ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm",
        state === "none"
          ? "bg-gradient-to-br from-accent to-accent-deep text-on-accent shadow-[0_8px_20px_-6px_rgba(143,185,220,0.55)] hover:brightness-110"
          : "bg-white/6 border border-white/12 text-white/80 hover:bg-white/10",
        className,
      )}
    >
      {state === "none" && <UserPlus className={compact ? "h-3.5 w-3.5" : "h-4 w-4"} />}
      {state === "following" && <Check className={compact ? "h-3.5 w-3.5 text-accent" : "h-4 w-4 text-accent"} />}
      {state === "requested" && <Clock className={compact ? "h-3.5 w-3.5 text-sand" : "h-4 w-4 text-sand"} />}
      {state === "none" ? "Follow" : state === "following" ? "Following" : "Requested"}
    </button>
  );
}
