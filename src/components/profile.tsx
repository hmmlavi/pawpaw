"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MessageCircle, MoreHorizontal, Ban, Flag, X, Loader2, Pencil, Camera, Check, Lock, Globe, UserX,
  Crop, Trash2, ImagePlus,
} from "lucide-react";
import { cn, ANIMAL_TYPES } from "@/lib/utils";
import type { PetLite } from "@/lib/queries";
import { PetAvatar } from "@/components/ui";
import { AnimalIcon } from "@/components/pet-identity";
import { AuthorRow } from "@/components/feed";
import { FollowButton } from "@/components/social-buttons";
import { toggleBlockAction, respondFollowRequestAction, removeFollowerAction } from "@/actions/content";
import { openConversationAction } from "@/actions/messages";
import { updatePetAction } from "@/actions/pets";
import { ReportSheet } from "@/components/feed";
import { ImageEditor } from "@/components/image-editor";
import { toast } from "sonner";

/* ─── Shared editable-pet shape ────────────── */

export type EditablePet = PetLite & {
  bio?: string | null;
  breed?: string | null;
  breedNote?: string | null;
  gender?: string | null;
  personality?: string[];
  interests?: string[];
  favoriteFood?: string | null;
  favoriteToys?: string | null;
  favoriteActivities?: string | null;
  birthday?: string | null;
  customAnimal?: string | null;
  city: string;
  cover?: string | null;
};

/* ─── Profile action bar ───────────────────── */

export function ProfileActions({
  pet,
  followState,
  isBlocked,
  viewerOwns,
}: {
  pet: EditablePet;
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
        <button className="btn-danger text-sm"
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

/** Owner-only floating button on the profile banner that opens the editor. */
export function BannerEditFab({ pet }: { pet: EditablePet }) {
  const [edit, setEdit] = useState(false);
  return (
    <>
      <button
        onClick={() => setEdit(true)}
        className="on-dark glass-hair absolute bottom-3 right-3 flex h-9 items-center gap-1.5 rounded-xl !border-white/20 !bg-black/45 px-3 text-xs font-bold text-white/90 backdrop-blur-md transition-colors hover:!bg-black/65"
        aria-label="Edit banner"
      >
        <Camera className="h-3.5 w-3.5" /> Edit cover
      </button>
      {edit && <EditProfileModal pet={pet} onClose={() => setEdit(false)} />}
    </>
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
        <div className="flex shrink-0 items-center justify-between border-b border-white/7 px-4 py-3.5">
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

export function EditProfileModal({ pet, onClose }: { pet: EditablePet; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [avatarPreview, setAvatarPreview] = useState<string | null>(pet.avatar);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(pet.cover ?? null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverRemoved, setCoverRemoved] = useState(false);
  const [avatarEditing, setAvatarEditing] = useState<string | null>(null);
  const [coverEditing, setCoverEditing] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(pet.isPrivate);
  const [icon, setIcon] = useState(pet.icon);
  const [animalType, setAnimalType] = useState(pet.animalType);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const blobUrls = useRef<Set<string>>(new Set());

  const track = (u: string) => {
    blobUrls.current.add(u);
    return u;
  };
  useEffect(() => () => {
    blobUrls.current.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !avatarEditing && !coverEditing) onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose, avatarEditing, coverEditing]);

  const ICON_CHOICES = ["dog", "cat", "bird", "rabbit", "hamster", "fish", "turtle", "bug", "paw"];

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[26px] sm:max-w-lg sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/7 px-4 py-4 sm:px-5">
          <h2 className="card-title min-w-0 truncate text-lg font-bold">Edit {pet.name}&apos;s identity</h2>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form
          className="flex min-h-0 flex-1 flex-col"
          action={(fd) => {
            fd.set("isPrivate", String(isPrivate));
            fd.set("identityIcon", icon);
            fd.set("animalType", animalType);
            if (avatarFile) fd.set("avatar", avatarFile);
            if (coverFile) fd.set("cover", coverFile);
            else if (coverRemoved) fd.set("removeCover", "true");
            start(async () => {
              const res = await updatePetAction(pet.id, fd);
              if (res.ok) { toast.success("Profile updated."); onClose(); router.refresh(); }
              else toast.error(res.error ?? "Could not update profile.");
            });
          }}
        >
          <div
            onFocus={(e) => {
              const t = e.target as HTMLElement;
              if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t instanceof HTMLSelectElement) {
                setTimeout(() => t.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
              }
            }}
            className="no-scrollbar min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
          >
            {/* avatar */}
            <div className="flex items-center gap-4">
              <button type="button" onClick={() => avatarRef.current?.click()} className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/15" aria-label="Upload profile photo">
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
              <input
                ref={avatarRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) setAvatarEditing(track(URL.createObjectURL(f)));
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-white/90">Profile photo</p>
                <p className="text-faint text-xs">Shown everywhere {pet.name} appears.</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button type="button" onClick={() => avatarRef.current?.click()} className="btn-ghost !px-3 !py-1.5 text-xs">
                    <Camera className="h-3.5 w-3.5" /> {avatarPreview ? "Change" : "Upload"}
                  </button>
                  {avatarPreview && (
                    <button
                      type="button"
                      onClick={() => {
                        if (avatarFile) setAvatarEditing(track(URL.createObjectURL(avatarFile)));
                        else if (pet.avatar) setAvatarEditing(pet.avatar);
                      }}
                      className="btn-ghost !px-3 !py-1.5 text-xs"
                    >
                      <Crop className="h-3.5 w-3.5" /> Adjust
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* banner */}
            <div>
              <label className="label">Profile banner</label>
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                {coverPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={coverPreview} alt="Profile banner" className="h-28 w-full object-cover sm:h-32" />
                ) : (
                  <div className="flex h-28 w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-accent/20 via-ink-3 to-sky/15 sm:h-32">
                    <ImagePlus className="h-5 w-5 text-white/40" />
                    <span className="text-faint text-xs">No banner yet — add one to make the profile shine.</span>
                  </div>
                )}
              </div>
              <input
                ref={coverRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) {
                    setCoverRemoved(false);
                    setCoverEditing(track(URL.createObjectURL(f)));
                  }
                }}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button type="button" onClick={() => coverRef.current?.click()} className="btn-ghost !px-3 !py-1.5 text-xs">
                  <Camera className="h-3.5 w-3.5" /> {coverPreview ? "Change banner" : "Add banner"}
                </button>
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      if (coverFile) setCoverEditing(track(URL.createObjectURL(coverFile)));
                      else if (coverPreview) setCoverEditing(coverPreview);
                    }}
                    className="btn-ghost !px-3 !py-1.5 text-xs"
                  >
                    <Crop className="h-3.5 w-3.5" /> Adjust
                  </button>
                )}
                {coverPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoverFile(null);
                      setCoverPreview(null);
                      setCoverRemoved(true);
                    }}
                    className="btn-ghost !px-3 !py-1.5 text-xs !text-clay"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="label">Identity icon (not verification)</label>
              <div className="flex flex-wrap gap-1.5">
                {ICON_CHOICES.map((ic) => (
                  <button key={ic} type="button" onClick={() => setIcon(ic)}
                    className={cn("flex h-10 w-10 items-center justify-center rounded-xl border transition-all", icon === ic ? "border-accent/50 bg-accent/15 text-accent" : "border-white/8 bg-white/3 text-white/50 hover:border-white/20")}>
                    <AnimalIcon icon={ic} className="h-4.5 w-4.5" />
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label">Name</label>
                <input name="name" defaultValue={pet.name} className="field" required maxLength={40} autoComplete="nickname" enterKeyHint="next" />
              </div>
              <div className="min-w-0">
                <label className="label">Animal</label>
                <select value={animalType} onChange={(e) => setAnimalType(e.target.value)} className="field">
                  {ANIMAL_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label">Breed</label>
                <input name="breed" defaultValue={pet.breed ?? ""} className="field" maxLength={50} placeholder="Optional" enterKeyHint="next" />
              </div>
              <div className="min-w-0">
                <label className="label">Birthday</label>
                <input name="birthday" type="date" defaultValue={pet.birthday ?? ""} className="field" max={new Date().toISOString().slice(0, 10)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label">Gender</label>
                <select name="gender" defaultValue={pet.gender ?? ""} className="field">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
              <div className="min-w-0">
                <label className="label">City</label>
                <input name="city" defaultValue={pet.city} className="field" maxLength={60} required autoComplete="address-level2" enterKeyHint="next" />
              </div>
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea name="bio" defaultValue={pet.bio ?? ""} rows={2} maxLength={200} className="field resize-none" placeholder={`A line or two about ${pet.name}…`} enterKeyHint="done" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="label">Personality (comma separated)</label>
                <input name="personality" defaultValue={(pet.personality ?? []).join(", ")} className="field" placeholder="Playful, Calm…" enterKeyHint="next" />
              </div>
              <div className="min-w-0">
                <label className="label">Interests (comma separated)</label>
                <input name="interests" defaultValue={(pet.interests ?? []).join(", ")} className="field" placeholder="Walks, Treats…" enterKeyHint="next" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="min-w-0">
                <label className="label">Favorite food</label>
                <input name="favoriteFood" defaultValue={pet.favoriteFood ?? ""} className="field" maxLength={60} enterKeyHint="next" />
              </div>
              <div className="min-w-0">
                <label className="label">Favorite toys</label>
                <input name="favoriteToys" defaultValue={pet.favoriteToys ?? ""} className="field" maxLength={60} enterKeyHint="next" />
              </div>
              <div className="min-w-0">
                <label className="label">Favorite activities</label>
                <input name="favoriteActivities" defaultValue={pet.favoriteActivities ?? ""} className="field" maxLength={60} enterKeyHint="done" />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/3 px-4 py-3.5">
              <span className="flex min-w-0 items-start gap-3">
                {isPrivate ? <Lock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-accent" /> : <Globe className="mt-0.5 h-4.5 w-4.5 shrink-0 text-white/55" />}
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white/90">{isPrivate ? "Private profile" : "Public profile"}</span>
                  <span className="text-faint block text-xs">{isPrivate ? "Followers need approval" : "Anyone can view and follow"}</span>
                </span>
              </span>
              <button
                type="button"
                onClick={() => setIsPrivate(!isPrivate)}
                className={cn("relative h-6.5 w-11.5 shrink-0 rounded-full transition-colors", isPrivate ? "bg-accent" : "bg-white/15")}
                role="switch" aria-checked={isPrivate} aria-label="Private profile"
              >
                <span className={cn("absolute top-0.75 h-5 w-5 rounded-full bg-white shadow transition-all", isPrivate ? "left-5.75" : "left-0.75")} />
              </button>
            </div>
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-white/7 px-4 py-3.5 sm:px-5 pb-[max(0.875rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Save changes</>}
            </button>
          </div>
        </form>
      </div>

      {avatarEditing && (
        <ImageEditor
          src={avatarEditing}
          title="Adjust profile photo"
          aspects={[{ label: "Avatar", value: 1 }]}
          shape="circle"
          outputSize={512}
          onConfirm={(blob) => {
            const file = new File([blob], "avatar-adjusted.jpg", { type: "image/jpeg" });
            setAvatarFile(file);
            setAvatarPreview(track(URL.createObjectURL(file)));
            if (avatarEditing.startsWith("blob:")) URL.revokeObjectURL(avatarEditing);
            setAvatarEditing(null);
            toast.success("Profile photo adjusted.");
          }}
          onCancel={() => {
            if (avatarEditing.startsWith("blob:")) URL.revokeObjectURL(avatarEditing);
            setAvatarEditing(null);
          }}
        />
      )}
      {coverEditing && (
        <ImageEditor
          src={coverEditing}
          title="Adjust banner"
          aspects={[{ label: "Banner 3:1", value: 3 }]}
          outputSize={1600}
          onConfirm={(blob) => {
            const file = new File([blob], "banner-adjusted.jpg", { type: "image/jpeg" });
            setCoverFile(file);
            setCoverPreview(track(URL.createObjectURL(file)));
            setCoverRemoved(false);
            if (coverEditing.startsWith("blob:")) URL.revokeObjectURL(coverEditing);
            setCoverEditing(null);
            toast.success("Banner adjusted.");
          }}
          onCancel={() => {
            if (coverEditing.startsWith("blob:")) URL.revokeObjectURL(coverEditing);
            setCoverEditing(null);
          }}
        />
      )}
    </div>
  );
}
