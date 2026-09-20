import {
  Dog, Cat, Bird, Rabbit, Squirrel, Fish, Turtle, Bug, PawPrint, Rat, Star, Cake, BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dog: Dog,
  cat: Cat,
  bird: Bird,
  rabbit: Rabbit,
  hamster: Rat,
  rat: Rat,
  squirrel: Squirrel,
  fish: Fish,
  turtle: Turtle,
  bug: Bug,
  paw: PawPrint,
};

export function AnimalIcon({ icon, className }: { icon: string; className?: string }) {
  const Cmp = ICONS[icon] ?? PawPrint;
  return <Cmp className={className} />;
}

/** The identity icon — NOT verification. A soft sage ring with the animal glyph. */
export function IdentityBadge({ icon, className, size = "md" }: { icon: string; className?: string; size?: "sm" | "md" }) {
  return (
    <span
      title="Pet identity"
      className={cn(
        "inline-flex items-center justify-center rounded-full border border-sage/40 bg-sage/15 text-sage shrink-0",
        size === "sm" ? "h-4.5 w-4.5" : "h-5.5 w-5.5",
        className,
      )}
    >
      <AnimalIcon icon={icon} className={size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3"} />
    </span>
  );
}

export function StarBadge({ className }: { className?: string }) {
  return (
    <span title="Star pet" className={cn("inline-flex items-center justify-center rounded-full border border-sand/50 bg-sand/15 text-sand h-5.5 w-5.5 shrink-0", className)}>
      <Star className="h-3 w-3 fill-sand" />
    </span>
  );
}

export function BirthdayBadge({ className }: { className?: string }) {
  return (
    <span title="Birthday today" className={cn("inline-flex items-center justify-center rounded-full border border-clay/50 bg-clay/15 text-clay h-5.5 w-5.5 shrink-0 animate-pulse-ring", className)}>
      <Cake className="h-3 w-3" />
    </span>
  );
}

/** Business verification — visually distinct green check seal. */
export function VerifiedBadge({ className }: { className?: string }) {
  return (
    <span title="Verified business" className={cn("inline-flex items-center justify-center text-emerald-400 shrink-0", className)}>
      <BadgeCheck className="h-4.5 w-4.5 fill-emerald-400/20" />
    </span>
  );
}
