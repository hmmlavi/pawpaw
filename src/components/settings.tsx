"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MapPin, User, Check, Loader2, Ban, LogOut, Plus, ShieldCheck, PawPrint, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ShellPet } from "@/components/app-shell";
import { PetAvatar } from "@/components/ui";
import { updateCityAction, updateDisplayNameAction, logoutAction, switchPetAction } from "@/actions/auth";
import { deletePetAction } from "@/actions/pets";
import { toggleBlockAction } from "@/actions/content";
import { toast } from "sonner";
import type { PetLite } from "@/lib/queries";

export function SettingsClient({
  email,
  displayName,
  city,
  pets,
  activePetId,
  maxPets,
  blocked,
}: {
  email: string;
  displayName: string;
  city: string;
  pets: ShellPet[];
  activePetId: string;
  maxPets: number;
  blocked: PetLite[];
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [cityVal, setCityVal] = useState(city);
  const [pending, start] = useTransition();

  const saveName = () => {
    start(async () => {
      const r = await updateDisplayNameAction(name);
      if (r.ok) toast.success("Name updated.");
      else toast.error(r.error ?? "Couldn't update.");
    });
  };
  const saveCity = () => {
    start(async () => {
      const r = await updateCityAction(cityVal);
      if (r.ok) toast.success("City updated — local discovery now follows it.");
      else toast.error(r.error ?? "Couldn't update.");
    });
  };

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* account */}
      <section className="glass glass-sheen animate-rise rounded-3xl p-5">
        <h2 className="card-title mb-1 text-base font-bold text-white/92">Account</h2>
        <p className="text-faint mb-4 text-xs">The human behind the pets — only you see this.</p>
        <div className="space-y-3.5">
          <div>
            <label className="label">Email</label>
            <p className="field !bg-white/3 text-white/60">{email}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Your name</label>
              <div className="flex gap-2">
                <input value={name} onChange={(e) => setName(e.target.value)} className="field" maxLength={60} />
                <button onClick={saveName} disabled={pending || name.trim() === displayName} className="btn-ghost shrink-0 !px-3"><Check className="h-4 w-4" /></button>
              </div>
            </div>
            <div>
              <label className="label">Your city</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <MapPin className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input value={cityVal} onChange={(e) => setCityVal(e.target.value)} className="field !pl-10" maxLength={60} placeholder="City" />
                </div>
                <button onClick={saveCity} disabled={pending || cityVal.trim() === city} className="btn-ghost shrink-0 !px-3"><Check className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
          <p className="text-faint text-[11px] leading-relaxed">Only city-level info is used for discovery. Your exact address is never requested or shown.</p>
        </div>
      </section>

      {/* pets */}
      <section className="glass glass-sheen animate-rise rounded-3xl p-5" style={{ animationDelay: "60ms" }}>
        <h2 className="card-title mb-1 text-base font-bold text-white/92">Your pets</h2>
        <p className="text-faint mb-4 text-xs">Up to {maxPets} pet identities per account. Switch anytime — no sign-out needed.</p>
        <div className="space-y-2">
          {pets.map((p) => (
            <div key={p.id} className={cn("flex items-center gap-3 rounded-2xl border p-3 transition-all", p.id === activePetId ? "border-sage/35 bg-sage/8" : "border-white/8 bg-white/3")}>
              <PetAvatar avatarFileId={p.avatar ? p.avatar.replace("/api/file/", "") : null} name={p.name} icon={p.icon} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white/92">{p.name} {p.id === activePetId && <span className="ml-1 text-[10px] font-bold uppercase text-sage">active</span>}</p>
                <p className="text-faint truncate text-xs">@{p.username}</p>
              </div>
              {p.id !== activePetId && (
                <button onClick={() => start(async () => { await switchPetAction(p.id); router.refresh(); toast.success(`Now acting as ${p.name}.`); })} className="btn-ghost !px-3 !py-1.5 text-xs">
                  Switch
                </button>
              )}
              <Link href={`/profile/${p.username}`} className="btn-ghost !px-3 !py-1.5 text-xs">Profile</Link>
              {pets.length > 1 && (
                <button aria-label={`Delete ${p.name}`}
                  onClick={() => { if (confirm(`Delete ${p.name}'s profile permanently? Their posts and messages go too. This can't be undone.`)) start(async () => { const r = await deletePetAction(p.id); if (r.ok) { toast.success(`${p.name}'s profile deleted.`); router.refresh(); } else toast.error(r.error ?? "Couldn't delete."); }); }}
                  className="btn-ghost !px-2.5 !py-1.5 text-xs !text-clay">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          {pets.length < maxPets && (
            <Link href="/onboarding" className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-white/14 bg-white/2 px-4 py-3.5 text-sm font-semibold text-sage transition-colors hover:bg-sage/8">
              <Plus className="h-4 w-4" /> Add another pet ({pets.length}/{maxPets})
            </Link>
          )}
        </div>
      </section>

      {/* blocked */}
      <section className="glass glass-sheen animate-rise rounded-3xl p-5" style={{ animationDelay: "120ms" }}>
        <h2 className="card-title mb-1 text-base font-bold text-white/92">Blocked pets</h2>
        <p className="text-faint mb-4 text-xs">Blocked pets can't follow, message or see {pets.find((p) => p.id === activePetId)?.name ?? "your active pet"}.</p>
        {blocked.length === 0 ? (
          <p className="text-faint rounded-2xl bg-white/3 px-4 py-3.5 text-center text-xs">Nobody blocked. Keep it kind out there.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((b) => (
              <div key={b.id} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/3 p-3">
                <PetAvatar avatarFileId={b.avatar ? b.avatar.replace("/api/file/", "") : null} name={b.name} icon={b.icon} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-white/88">{b.name}</p>
                  <p className="text-faint truncate text-xs">@{b.username}</p>
                </div>
                <button onClick={() => start(async () => { const r = await toggleBlockAction(b.id); if (!r.blocked) { toast.success(`${b.name} unblocked.`); router.refresh(); } })} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <Ban className="h-3.5 w-3.5" /> Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* privacy */}
      <section className="glass glass-sheen animate-rise rounded-3xl p-5" style={{ animationDelay: "180ms" }}>
        <h2 className="card-title mb-3 flex items-center gap-2 text-base font-bold text-white/92"><ShieldCheck className="h-4.5 w-4.5 text-sage" /> Privacy commitments</h2>
        <ul className="text-dim space-y-2 text-[13px] leading-relaxed">
          <li>· Health Vault records are private by default and never appear on public profiles.</li>
          <li>· Discovery uses city-level location only — exact addresses are never exposed.</li>
          <li>· Private profiles require your approval for every follower.</li>
          <li>· Birthday and star badges are automatic system states; green checks belong to reviewed businesses only.</li>
          <li>· Reports go to review confidentially; animal cruelty is prioritized.</li>
        </ul>
      </section>

      <button onClick={() => start(async () => { await logoutAction(); })} disabled={pending} className="btn-danger w-full text-sm">
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><LogOut className="h-4 w-4" /> Sign out</>}
      </button>
    </div>
  );
}
