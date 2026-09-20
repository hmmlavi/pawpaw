"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, MoreHorizontal, Ban, Flag, X, Loader2, Pencil, Camera, Check, Lock, Globe, UserX,
} from "lucide-react";
import { cn, ANIMAL_TYPES } from "@/lib/utils";
import type { PetLite } from "@/lib/queries";
import { PetAvatar } from "@/components/ui";
import { AnimalIcon } from "@/components/pet-identity";
import { AuthorRow } from "@/components/feed";
import { FollowButton } from "@/components/social-buttons";
import { followAction, toggleBlockAction, respondFollowRequestAction, removeFollowerAction, reportAction } from "@/actions/content";
import { openConversationAction } from "@/actions/messages";
import { updatePetAction } from "@/actions/pets";
import { ReportSheet } from "@/components/feed";
import { toast } from "sonner";

/* ─── Profile action bar ───────────────────── */

export function ProfileActions({
  pet,
  followState,
  isBlocked,
  viewerOwns,
}: {
  pet: PetLite;
  followState: "none" | "following" | "requested";
  isBlocked: boolean;
  viewerOwns: boolean;
}) {
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const [report, setReport] = useState(false);
  const [edit, setEdit] = useState(false);
  const [blocked, setBlocked] = useState(isBlocked);
  const [, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setMenu(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (viewerOwns) {
    return (
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setEdit(true)} className="btn-ghost text-sm"><Pencil className="h-4 w-4" /> Edit profile</button>
        {edit && <EditProfileModal pet={pet} onClose={() => setEdit(false)} />}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {blocked ? (
        <button className="btn-danger text-sm" disabled={undefined}
          onClick={() => start(async () => { const r = await toggleBlockAction(pet.id); setBlocked(r.blocked); if (!r.blocked) toast.success(`${pet.name} unblocked.`); })}>
          <Ban className="h-4 w-4" /> Unblock
        </button>
      ) : (
        <>
          <FollowButton targetId={pet.id} initial={followState} />
          <button className="btn-ghost text-sm"
            onClick={() => start(async () => {
              const res = await openConversationAction(pet.id);
              if (res.conversationId) { router.push(`/messages?c=${res.conversationId}`); }
              else toast.error(res.error ?? "Couldn't open chat.");
            })}>
            <MessageCircle className="h-4 w-4" /> Message
          </button>
        </>
      )}
      <div className="relative" ref={ref}>
        <button onClick={() => setMenu((v) => !v)} className="glass-hair flex h-9.5 w-9.5 items-center justify-center rounded-xl transition-colors hover:bg-white/10" aria-label="More options">
          <MoreHorizontal className="h-4.5 w-4.5 text-white/75" />
        </button>
        {menu && (
          <div className="glass-deep absolute right-0 top-11 z-20 w-52 animate-scale-in rounded-2xl p-1.5 origin-top-right">
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 transition-colors hover:bg-white/8"
              onClick={() => { setMenu(false); start(async () => { const r = await toggleBlockAction(pet.id); setBlocked(r.blocked); toast.success(r.blocked ? `${pet.name} blocked.` : `${pet.name} unblocked.`); if (r.blocked) router.refresh(); }); }}>
              <Ban className="h-4 w-4" /> {blocked ? "Unblock" : "Block"} @{pet.username}
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm text-white/80 transition-colors hover:bg-white/8" onClick={() => { setMenu(false); setReport(true); }}>
              <Flag className="h-4 w-4" /> Report profile
            </button>
          </div>
        )}
      </div>
      {report && <ReportSheet targetType="profile" targetId={pet.id} onClose={() => setReport(false)} />}
    </div>
  );
}

export function FollowListTrigger({
  label,
  count,
  list,
  viewerOwns,
  meId,
}: {
  label: string;
  count: number;
  list: PetLite[];
  viewerOwns: boolean;
  meId: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className="text-center transition-opacity hover:opacity-75">
        <div className="font-display text-lg font-bold text-white/95 tabular-nums">{count}</div>
        <div className="text-faint text-[10px] font-semibold uppercase tracking-wider">{label}</div>
      </button>
      {open && <FollowListModal title={label} list={list} viewerOwns={viewerOwns} meId={meId} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ─── Followers / following modal ──────────── */

export function FollowListModal({
  title,
  list,
  viewerOwns,
  meId,
  onClose,
}: {
  title: string;
  list: PetLite[];
  viewerOwns: boolean;
  meId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center animate-fade" onClick={onClose}>
      <div className="glass-deep max-h-[70dvh] w-full max-w-sm overflow-hidden rounded-[24px] animate-scale-in flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-4 py-3.5">
          <h3 className="card-title text-base font-bold">{title}</h3>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <div className="no-scrollbar flex-1 space-y-0.5 overflow-y-auto p-2">
          {list.length === 0 && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-bold text-white/80">Your pet's circle starts here.</p>
              <p className="text-faint mt-1 text-xs">No {title.toLowerCase()} yet — they'll appear when pets connect.</p>
            </div>
          )}
          {list.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition-colors hover:bg-white/5">
              <div className="min-w-0 flex-1" onClick={() => { onClose(); router.push(`/profile/${p.username}`); }}>
                <AuthorRow pet={p} size="sm" />
              </div>
              {viewerOwns && title === "Followers" && p.id !== meId && (
                <button className="btn-ghost !px-2.5 !py-1 text-[11px]" disabled={pending}
                  onClick={() => start(async () => { const r = await removeFollowerAction(p.id); if (r.ok) { toast.success("Follower removed."); router.refresh(); } })}>
                  <UserX className="h-3 w-3" /> Remove
                </button>
              )}
              {p.id !== meId && !(viewerOwns && title === "Followers") && <FollowButton targetId={p.id} compact />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RequestsPanel({ requests }: { requests: { followId: string; pet: PetLite }[] }) {
  const router = useRouter();
  const [, start] = useTransition();
  if (requests.length === 0) return null;
  return (
    <div className="glass glass-sheen mb-5 rounded-3xl border-sand/25 p-4 animate-rise">
      <p className="mb-2.5 text-sm font-bold text-sand">{requests.length} follow {requests.length === 1 ? "request" : "requests"}</p>
      <div className="space-y-1.5">
        {requests.map((r) => (
          <div key={r.followId} className="flex items-center gap-2 rounded-2xl bg-white/4 px-2.5 py-2">
            <AuthorRow pet={r.pet} size="sm" />
            <div className="ml-auto flex shrink-0 gap-1.5">
              <button className="btn-primary !px-3 !py-1.5 text-[11px]"
                onClick={() => start(async () => { const res = await respondFollowRequestAction(r.followId, true); if (res.ok) { toast.success("Request accepted."); router.refresh(); } })}>
                Accept
              </button>
              <button className="btn-ghost !px-3 !py-1.5 text-[11px]"
                onClick={() => start(async () => { const res = await respondFollowRequestAction(r.followId, false); if (res.ok) router.refresh(); })}>
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Edit profile modal ───────────────────── */

export function EditProfileModal({ pet, onClose }: { pet: PetLite & { bio?: string; breed?: string | null; breedNote?: string; gender?: string; personality?: string[]; interests?: string[]; favoriteFood?: string; favoriteToys?: string; favoriteActivities?: string; birthday?: string | null; customAnimal?: string | null; city: string }; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState(pet.avatar);
  const [isPrivate, setIsPrivate] = useState(pet.isPrivate);
  const [icon, setIcon] = useState(pet.icon);
  const [animalType, setAnimalType] = useState(pet.animalType);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  const ICON_CHOICES = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "turtle", "bug", "paw"];

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <h2 className="card-title text-lg font-bold">Edit {pet.name}'s identity</h2>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form
          className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4"
          action={(fd) => {
            fd.set("isPrivate", String(isPrivate));
            fd.set("identityIcon", icon);
            fd.set("animalType", animalType);
            start(async () => {
              const res = await updatePetAction(pet.id, fd);
              if (res.ok) { toast.success("Profile updated."); onClose(); router.refresh(); }
              else toast.error(res.error ?? "Could not update profile.");
            });
          }}
        >
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => avatarRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/15">
              {avatarPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarPreview} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/6"><AnimalIcon icon={icon} className="h-7 w-7 text-sage/70" /></span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera className="h-5 w-5 text-white" />
              </span>
            </button>
            <input ref={avatarRef} name="avatar" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setAvatarPreview(URL.createObjectURL(f)); }} />
            <div className="min-w-0 flex-1">
              <button type="button" onClick={() => coverRef.current?.click()} className="btn-ghost !px-3.5 !py-2 text-xs">
                <Camera className="h-3.5 w-3.5" /> {coverPreview || pet.avatar ? "Change cover" : "Add cover"}
              </button>
              <input ref={coverRef} name="cover" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setCoverPreview(URL.createObjectURL(f)); }} />
              {coverPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="cover" className="mt-2 h-16 w-full rounded-xl border border-white/10 object-cover" />
              )}
            </div>
          </div>

          <div>
            <label className="label">Identity icon (not verification)</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_CHOICES.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={cn("flex h-10 w-10 items-center justify-center rounded-xl border transition-all", icon === ic ? "border-sage/50 bg-sage/15 text-sage" : "border-white/8 bg-white/3 text-white/50 hover:border-white/20")}>
                  <AnimalIcon icon={ic} className="h-4.5 w-4.5" />
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Name</label>
              <input name="name" defaultValue={pet.name} className="field" required maxLength={40} />
            </div>
            <div>
              <label className="label">Animal</label>
              <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="field">
                {ANIMAL_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Breed</label>
              <input name="breed" defaultValue={pet.breed ?? ""} className="field" maxLength={50} placeholder="Optional" />
            </div>
            <div>
              <label className="label">Birthday</label>
              <input name="birthday" type="date" defaultValue={pet.birthday ?? ""} className="field" max={new Date().toISOString().slice(0, 10)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Gender</label>
              <select name="gender" defaultValue={pet.gender ?? ""} className="field">
                <option value="">Prefer not to say</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </div>
            <div>
              <label className="label">City</label>
              <input name="city" defaultValue={pet.city} className="field" maxLength={60} required />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea name="bio" defaultValue={pet.bio ?? ""} rows={2} maxLength={200} className="field resize-none" placeholder={`A line or two about ${pet.name}…`} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Personality (comma separated)</label>
              <input name="personality" defaultValue={(pet.personality ?? []).join(", ")} className="field" placeholder="Playful, Calm…" />
            </div>
            <div>
              <label className="label">Interests (comma separated)</label>
              <input name="interests" defaultValue={(pet.interests ?? []).join(", ")} className="field" placeholder="Walks, Treats…" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Favorite food</label>
              <input name="favoriteFood" defaultValue={pet.favoriteFood ?? ""} className="field" maxLength={60} />
            </div>
            <div>
              <label className="label">Favorite toys</label>
              <input name="favoriteToys" defaultValue={pet.favoriteToys ?? ""} className="field" maxLength={60} />
            </div>
            <div>
              <label className="label">Favorite activities</label>
              <input name="favoriteActivities" defaultValue={pet.favoriteActivities ?? ""} className="field" maxLength={60} />
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-white/8 bg-white/3 px-4 py-3.5">
            <span className="flex items-start gap-3">
              {isPrivate ? <Lock className="mt-0.5 h-4.5 w-4.5 text-sage" /> : <Globe className="mt-0.5 h-4.5 w-4.5 text-white/55" />}
              <span>
                <span className="block text-sm font-bold text-white/90">{isPrivate ? "Private profile" : "Public profile"}</span>
                <span className="text-faint block text-xs">{isPrivate ? "Followers need approval" : "Anyone can view and follow"}</span>
              </span>
            </span>
            <button
              type="button"
              onClick={() => setIsPrivate(!isPrivate)}
              className={cn("relative h-6.5 w-11.5 shrink-0 rounded-full transition-colors", isPrivate ? "bg-sage" : "bg-white/15")}
              role="switch" aria-checked={isPrivate} aria-label="Private profile"
            >
              <span className={cn("absolute top-0.75 h-5 w-5 rounded-full bg-white shadow transition-all", isPrivate ? "left-5.75" : "left-0.75")} />
            </button>
          </div>

          <div className="flex justify-end gap-2 pb-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
