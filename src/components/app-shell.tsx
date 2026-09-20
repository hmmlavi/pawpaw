"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PawPrint, Home, Compass, Sparkles, MessagesSquare, Plus, Bell, Search, ChevronDown,
  Image as ImageIcon, Clapperboard, CircleDashed, Settings, LogOut, HeartPulse, Check, UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PetAvatar } from "@/components/ui";
import { switchPetAction, logoutAction } from "@/actions/auth";
import { IdentityBadge } from "@/components/pet-identity";

export type ShellPet = {
  id: string;
  name: string;
  username: string;
  icon: string;
  avatar: string | null;
};

export function AppShell({
  activePet,
  pets,
  unread,
  openComposer,
  children,
}: {
  activePet: ShellPet | null;
  pets: ShellPet[];
  unread: number;
  openComposer: (kind: "post" | "reel" | "story") => void;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pending, start] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Close the menu on navigation, derived during render (no cascading effect).
  const [menuPath, setMenuPath] = useState(pathname);
  if (pathname !== menuPath) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  const dockItems = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/messages", label: "Chat", icon: MessagesSquare },
    { href: activePet ? `/profile/${activePet.username}` : "/settings", label: "Profile", icon: null, petAvatar: activePet },
  ];

  const isActive = (href: string | null) =>
    !!href && (pathname === href || (href !== "/home" && pathname.startsWith(href)));

  return (
    <div className="min-h-dvh pb-32 md:pb-28">
      {/* ── Top floating bar ─────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4 pointer-events-none">
        <div className="glass-deep mx-auto flex max-w-6xl items-center gap-2 rounded-2xl px-3 py-2 pointer-events-auto sm:gap-3">
          <Link href="/home" className="flex items-center gap-2 shrink-0" aria-label="Pawkind home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent/40 to-sky/25 border border-white/15">
              <PawPrint className="h-4 w-4 text-accent" />
            </span>
            <span className="font-display hidden text-[16px] font-bold tracking-tight lg:block">Pawkind</span>
          </Link>

          {/* search */}
          <button
            onClick={() => router.push("/search")}
            className="glass-hair mx-auto flex h-9.5 w-full max-w-md items-center gap-2.5 rounded-xl px-3.5 text-left text-sm text-white/35 transition-colors hover:text-white/60"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="truncate">Search pets, places, events…</span>
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <Link href="/notifications" aria-label="Notifications"
              className={cn("glass-hair relative flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-white/10", isActive("/notifications") && "dock-active")}>
              <Bell className="h-4.5 w-4.5 text-white/80" />
              {unread > 0 && (
                <span className="on-dark absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay px-1 text-[9px] font-bold text-white shadow-lg">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            {/* pet switcher */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((v) => !v)} className="glass-hair flex h-9 items-center gap-1.5 rounded-xl pl-1.5 pr-2 transition-colors hover:bg-white/10" aria-label="Switch pet / account">
                {activePet ? (
                  <PetAvatar avatarFileId={activePet.avatar} name={activePet.name} icon={activePet.icon} size="xs" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8"><UserRound className="h-3.5 w-3.5 text-white/60" /></span>
                )}
                <span className="hidden max-w-16 truncate text-xs font-bold text-white/85 sm:block">{activePet?.name ?? "Account"}</span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-white/50 transition-transform", menuOpen && "rotate-180")} />
              </button>

              {menuOpen && (
                <div className="glass-deep animate-scale-in absolute right-0 top-11 w-64 origin-top-right rounded-2xl p-1.5" role="menu">
                  <p className="text-faint px-3 pb-1.5 pt-2 text-[10px] font-bold tracking-widest uppercase">Acting as</p>
                  {pets.map((p) => (
                    <button key={p.id} disabled={pending}
                      onClick={() => start(async () => { await switchPetAction(p.id); setMenuOpen(false); router.refresh(); })}
                      className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/8", p.id === activePet?.id && "bg-accent/10")}>
                      <PetAvatar avatarFileId={p.avatar} name={p.name} icon={p.icon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white/90">{p.name}</span>
                        <span className="text-faint block truncate text-xs">@{p.username}</span>
                      </span>
                      {p.id === activePet?.id ? <Check className="h-4 w-4 text-accent" /> : <IdentityBadge icon={p.icon} />}
                    </button>
                  ))}
                  {pets.length < 2 && (
                    <Link href="/onboarding" className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-white/12 px-2.5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent/10">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/12"><Plus className="h-4 w-4" /></span>
                      Add another pet
                    </Link>
                  )}
                  <div className="divider my-1.5" />
                  <Link href="/health" className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 transition-colors hover:bg-white/8">
                    <HeartPulse className="h-4 w-4 text-clay" /> Health vault
                  </Link>
                  <Link href="/settings" className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 transition-colors hover:bg-white/8">
                    <Settings className="h-4 w-4 text-white/60" /> Settings
                  </Link>
                  <button onClick={() => start(async () => { await logoutAction(); })} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-clay transition-colors hover:bg-clay/10">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Page content ─────────────────────────────── */}
      <div className="mx-auto w-full max-w-6xl px-3 pt-[4.6rem] sm:px-5 sm:pt-[5.2rem]">{children}</div>

      {/* ── Floating create action ──────────────────── */}
      <CreateFab onPick={openComposer} />

      {/* ── Floating spatial dock ────────────────────── */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]" aria-label="Primary">
        <div className="glass-deep glass-sheen pointer-events-auto flex items-stretch gap-0.5 rounded-[24px] p-1.5 sm:gap-1">
          {dockItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} aria-label={item.label} aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex w-14 flex-col items-center justify-center gap-1 rounded-2xl border border-transparent px-1 py-2 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/8 sm:w-16",
                  active ? "dock-active" : "text-white/55 hover:text-white/90",
                )}>
                <span className="flex h-7 w-7 items-center justify-center">
                  {item.petAvatar ? (
                    <PetAvatar avatarFileId={item.petAvatar.avatar} name={item.petAvatar.name} icon={item.petAvatar.icon} size="xs" className={cn(active && "ring-2 ring-accent/60")} />
                  ) : item.icon ? (
                    <item.icon className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
                  ) : (
                    <UserRound className="h-5 w-5" />
                  )}
                </span>
                <span className={cn("text-[10px] leading-none tracking-wide", active ? "font-bold" : "font-semibold")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function CreateFab({
  onPick,
}: {
  onPick: (kind: "post" | "reel" | "story") => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const options = [
    { kind: "post" as const, icon: ImageIcon, label: "Create Post", tint: "text-accent" },
    { kind: "story" as const, icon: CircleDashed, label: "Add Story", tint: "text-clay" },
    { kind: "reel" as const, icon: Clapperboard, label: "Create Reel", tint: "text-sky" },
  ];

  return (
    <div
      ref={ref}
      className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col items-end gap-2.5 sm:right-6"
    >
      {open && (
        <div className="flex flex-col items-end gap-2" role="menu" aria-label="Create">
          {options.map((o, i) => (
            <button
              key={o.kind}
              role="menuitem"
              onClick={() => { setOpen(false); onPick(o.kind); }}
              style={{ animationDelay: `${(options.length - 1 - i) * 45}ms` }}
              className="glass-deep glass-sheen group flex animate-rise-fast items-center gap-3 rounded-2xl py-2 pl-4 pr-2.5 transition-all duration-300 hover:-translate-y-0.5"
            >
              <span className="text-[13px] font-bold whitespace-nowrap text-white/90">{o.label}</span>
              <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform duration-300 group-hover:scale-110">
                <o.icon className={cn("h-4.5 w-4.5", o.tint)} />
              </span>
            </button>
          ))}
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Close creation menu" : "Create post, story or reel"}
        className={cn(
          "group flex h-14 w-14 items-center justify-center rounded-[20px] bg-gradient-to-br from-accent to-accent-deep text-on-accent transition-all duration-300 hover:-translate-y-1 active:translate-y-0",
          open
            ? "shadow-[0_16px_34px_-8px_rgba(143,185,220,0.8)]"
            : "shadow-[0_10px_26px_-8px_rgba(143,185,220,0.7)] hover:shadow-[0_16px_34px_-8px_rgba(143,185,220,0.8)]",
        )}
      >
        <Plus className={cn("h-6 w-6 transition-transform duration-300 group-hover:rotate-90", open && "rotate-45")} strokeWidth={2.5} />
      </button>
    </div>
  );
}
