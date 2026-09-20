import { cn, fileUrl } from "@/lib/utils";
import { AnimalIcon } from "./pet-identity";
import Link from "next/link";

export function PetAvatar({
  avatarFileId,
  name,
  icon,
  size = "md",
  className,
}: {
  avatarFileId?: string | null;
  name: string;
  icon: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const url = fileUrl(avatarFileId);
  const sizes = {
    xs: "h-7 w-7 text-[10px]",
    sm: "h-9 w-9 text-xs",
    md: "h-11 w-11 text-sm",
    lg: "h-16 w-16 text-lg",
    xl: "h-24 w-24 text-3xl",
  } as const;
  const iconSizes = { xs: "h-3 w-3", sm: "h-4 w-4", md: "h-5 w-5", lg: "h-7 w-7", xl: "h-10 w-10" } as const;
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-gradient-to-br from-sage/25 via-ink-3 to-sky/20 border border-white/10 font-display font-semibold text-sage",
        sizes[size],
        className,
      )}
    >
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <AnimalIcon icon={icon} className={cn("text-sage/70", iconSizes[size])} />
      )}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  body,
  actionHref,
  actionLabel,
  className,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("glass glass-sheen rounded-3xl p-10 text-center animate-rise", className)}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-sage/20 to-sky/10 border border-white/10">
        <Icon className="h-6 w-6 text-sage/80" />
      </div>
      <h3 className="card-title text-lg font-semibold text-white/90">{title}</h3>
      {body && <p className="text-dim mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">{body}</p>}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="btn-ghost mt-5 inline-flex">
          {actionLabel}
        </Link>
      )}
      {children}
    </div>
  );
}

export function SectionHeader({ title, sub, href, linkLabel }: { title: string; sub?: string; href?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4 px-1">
      <div>
        <h2 className="card-title text-[17px] font-semibold tracking-tight text-white/92">{title}</h2>
        {sub && <p className="text-faint mt-0.5 text-xs">{sub}</p>}
      </div>
      {href && (
        <Link href={href} className="text-sage/90 hover:text-sage text-xs font-semibold whitespace-nowrap transition-colors">
          {linkLabel ?? "See all"} →
        </Link>
      )}
    </div>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <div className="font-display text-lg font-bold text-white/95 tabular-nums">{value}</div>
      <div className="text-faint text-[11px] font-medium tracking-wide uppercase">{label}</div>
    </div>
  );
}

export function LoadingGrid({ count = 3, height = "h-40" }: { count?: number; height?: string }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(auto-fill,minmax(min(100%,240px),1fr))` }}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={cn("skeleton", height)} />
      ))}
    </div>
  );
}
