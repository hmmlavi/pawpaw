"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  PawPrint, Home, Compass, Sparkles, MessagesSquare, Plus, Bell, Search, ChevronDown,
  Image as ImageIcon, Clapperboard, CircleDashed, Settings, LogOut, HeartPulse, Check, UserRound, X,
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
  const [searchQ, setSearchQ] = useState("");

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [pathname]);

  const dockItems = [
    { href: "/home", label: "Home", icon: Home },
    { href: "/explore", label: "Explore", icon: Compass },
    { href: null as string | null, label: "Create", icon: Plus, action: () => openComposer("post") },
    { href: "/ai", label: "AI", icon: Sparkles },
    { href: "/messages", label: "Messages", icon: MessagesSquare },
    { href: activePet ? `/profile/${activePet.username}` : "/settings", label: "Profile", icon: activePet ? null : UserRound, petAvatar: activePet },
  ];

  const isActive = (href: string | null) => !!href && (pathname === href || (href !== "/home" && pathname.startsWith(href)));

  return (
    <div className="min-h-dvh pb-28 md:pb-24">
      {/* ── Top floating bar ─────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-5 sm:pt-4 pointer-events-none">
        <div className="glass-deep mx-auto flex max-w-6xl items-center gap-2 rounded-2xl px-3 py-2 pointer-events-auto sm:gap-3">
          <Link href="/home" className="flex items-center gap-2 shrink-0" aria-label="Pawkind home">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sage/40 to-sky/25 border border-white/15">
              <PawPrint className="h-4 w-4 text-sage" />
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
                <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-clay px-1 text-[9px] font-bold text-white shadow-lg">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>

            {/* pet switcher */}
            <div className="relative" ref={menuRef}>
              <button onClick={() => setMenuOpen((v) => !v)} className="glass-hair flex h-9 items-center gap-1.5 rounded-xl pl-1.5 pr-2 transition-colors hover:bg-white/10" aria-label="Switch pet / account">
                {activePet ? (
                  <PetAvatar avatarFileId={activePet.avatar ? activePet.avatar.replace("/api/file/", "") : null} name={activePet.name} icon={activePet.icon} size="xs" />
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
                      className={cn("flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/8", p.id === activePet?.id && "bg-sage/10")}>
                      <PetAvatar avatarFileId={p.avatar ? p.avatar.replace("/api/file/", "") : null} name={p.name} icon={p.icon} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-white/90">{p.name}</span>
                        <span className="text-faint block truncate text-xs">@{p.username}</span>
                      </span>
                      {p.id === activePet?.id ? <Check className="h-4 w-4 text-sage" /> : <IdentityBadge icon={p.icon} />}
                    </button>
                  ))}
                  {pets.length < 2 && (
                    <Link href="/onboarding" className="mt-0.5 flex w-full items-center gap-2.5 rounded-xl border border-dashed border-white/12 px-2.5 py-2 text-sm font-semibold text-sage transition-colors hover:bg-sage/10">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sage/12"><Plus className="h-4 w-4" /></span>
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

      {/* ── Floating spatial dock ────────────────────── */}
      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))]">
        <div className="glass-deep glass-sheen pointer-events-auto flex items-center gap-0.5 rounded-[22px] p-1.5 sm:gap-1">
          {dockItems.map((item) => {
            if (item.action) {
              return (
                <button key="create" onClick={item.action} aria-label="Create"
                  className="group relative mx-0.5 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sage to-sage-deep text-ink shadow-[0_10px_26px_-8px_rgba(143,185,154,0.7)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_34px_-8px_rgba(143,185,154,0.8)] active:translate-y-0">
                  <Plus className="h-5.5 w-5.5 transition-transform duration-300 group-hover:rotate-90" strokeWidth={2.5} />
                </button>
              );
            }
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href!} aria-label={item.label}
                className={cn(
                  "relative flex h-11 w-11 items-center justify-center rounded-2xl border border-transparent text-white/55 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/8 hover:text-white/90 sm:w-12",
                  active && "dock-active",
                )}>
                {item.petAvatar ? (
                  <PetAvatar avatarFileId={item.petAvatar.avatar ? item.petAvatar.avatar.replace("/api/file/", "") : null} name={item.petAvatar.name} icon={item.petAvatar.icon} size="sm" className={cn(active && "ring-2 ring-sage/60")} />
                ) : item.icon ? (
                  <item.icon className="h-5 w-5" />
                ) : null}
                {active && <span className="absolute -bottom-[7px] h-1 w-1 rounded-full bg-sage shadow-[0_0_8px_2px_rgba(143,185,154,0.6)]" />}
                {item.href === "/messages" && unread > 0 && null}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export function CreateLauncher({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (kind: "post" | "reel" | "story") => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  if (!open) return null;
  const options = [
    { kind: "post" as const, icon: ImageIcon, title: "Post", body: "Photos with a caption — up to 8 in a carousel.", tint: "text-sage", bg: "from-sage/25" },
    { kind: "reel" as const, icon: Clapperboard, title: "Reel", body: "A vertical video moment. Add your own edited audio beforehand.", tint: "text-sky", bg: "from-sky/25" },
    { kind: "story" as const, icon: CircleDashed, title: "Story", body: "A photo, video or text that lives for 24 hours.", tint: "text-clay", bg: "from-clay/25" },
  ];
  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center animate-fade" onClick={onClose}>
      <div className="glass-deep glass-sheen w-full max-w-md rounded-[26px] p-5 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="card-title text-lg font-bold">Create</h2>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-2.5">
          {options.map((o) => (
            <button key={o.kind} onClick={() => onPick(o.kind)}
              className="group flex w-full items-center gap-4 rounded-2xl border border-white/8 bg-white/3 p-4 text-left transition-all duration-300 hover:border-white/20 hover:bg-white/6 hover:-translate-y-0.5">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${o.bg} to-transparent`}>
                <o.icon className={`h-5 w-5 ${o.tint}`} />
              </span>
              <span>
                <span className="block text-[15px] font-bold text-white/92">{o.title}</span>
                <span className="text-faint block text-xs leading-relaxed">{o.body}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
