"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  X, Loader2, MapPin, CalendarHeart, Check, Star, Trash2, ExternalLink, Phone, Mail, Clock,
  Globe, Siren, Camera, HeartHandshake, Plus, BadgeCheckIcon,
} from "lucide-react";
import { cn, mapsUrl, formatEventDate, formatEventTime, eventCategoryLabel, businessCategoryLabel, EVENT_CATEGORIES, BUSINESS_CATEGORIES, ANIMAL_TYPES, animalLabel } from "@/lib/utils";
import { toggleEventAttendanceAction, createEventAction, deleteEventAction, createBusinessAction, deleteBusinessAction, createAdoptionListingAction, setAdoptionStatusAction, deleteAdoptionAction } from "@/actions/local";
import { VerifiedBadge } from "@/components/pet-identity";
import { toast } from "sonner";
import type { events, businesses, adoptions } from "@/db/schema";

type Event = typeof events.$inferSelect;
type Biz = typeof businesses.$inferSelect;
type Adoption = typeof adoptions.$inferSelect;

function useEscClose(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);
}

/* ═══ EVENTS ═══════════════════════════════ */

export function EventAttendanceButton({ eventId, initial, disabled }: { eventId: string; initial: "going" | "interested" | "none"; disabled?: boolean }) {
  const [state, setState] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-1.5">
      <button
        disabled={pending || disabled}
        onClick={() => start(async () => { const r = await toggleEventAttendanceAction(eventId, "going"); setState(r.state); if (r.state === "going") toast.success("You're going!"); })}
        className={cn("chip !py-2", state === "going" && "!border-accent/50 !bg-accent/15 !text-accent")}
      >
        {state === "going" && <Check className="h-3.5 w-3.5" />} Going
      </button>
      <button
        disabled={pending || disabled}
        onClick={() => start(async () => { const r = await toggleEventAttendanceAction(eventId, "interested"); setState(r.state); })}
        className={cn("chip !py-2", state === "interested" && "!border-sand/50 !bg-sand/15 !text-sand")}
      >
        {state === "interested" && <Star className="h-3.5 w-3.5" />} Interested
      </button>
    </div>
  );
}

export function EventCard({
  event: e,
  myState,
  goingCount,
  interestedCount,
  isOwner,
}: {
  event: Event;
  myState: "going" | "interested" | "none";
  goingCount: number;
  interestedCount: number;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const d = new Date(e.startsAt);
  const full = e.capacity ? goingCount >= e.capacity : false;

  return (
    <article className="glass glass-sheen glass-hover animate-rise overflow-hidden rounded-[26px]">
      {e.imageFileId && (
        <div className="relative h-40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/file/${e.imageFileId}`} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <span className="on-dark absolute left-4 top-4 chip !cursor-default !border-white/20 bg-black/45 !text-white backdrop-blur-md !py-1 text-[10px]">{eventCategoryLabel(e.category)}</span>
        </div>
      )}
      <div className="p-4.5">
        <div className="flex items-start gap-3.5">
          <span className="flex h-13 w-13 shrink-0 flex-col items-center justify-center rounded-2xl bg-sand/12 border border-sand/25 text-sand">
            <span className="text-lg font-bold leading-none">{d.getDate()}</span>
            <span className="text-[9px] font-bold uppercase">{d.toLocaleDateString("en-US", { month: "short" })}</span>
          </span>
          <div className="min-w-0 flex-1">
            {!e.imageFileId && <span className="chip mb-1.5 !cursor-default !py-0.5 text-[10px]">{eventCategoryLabel(e.category)}</span>}
            <h3 className="card-title truncate text-[17px] font-bold text-white/93">{e.title}</h3>
            <p className="text-dim mt-0.5 text-xs">{formatEventDate(e.startsAt)} · {formatEventTime(e.startsAt)}</p>
          </div>
        </div>

        {e.description && <p className="text-dim mt-3 line-clamp-2 text-[13px] leading-relaxed">{e.description}</p>}

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/55">
          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-clay" />{e.venue || e.city}{e.venue && `, ${e.city}`}</span>
          <span>{goingCount} going · {interestedCount} interested{e.capacity ? ` · cap ${e.capacity}` : ""}</span>
          {full && <span className="font-bold text-clay">Full</span>}
        </div>
        {e.petTypes.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {e.petTypes.map((t) => <span key={t} className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/55">{animalLabel(t)}</span>)}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {!isOwner && <EventAttendanceButton eventId={e.id} initial={myState} disabled={full && myState !== "going"} />}
          <a href={mapsUrl(e.address || e.venue, e.city)} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-3 !py-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5" /> Open in Google Maps
          </a>
          {isOwner && (
            <button className="btn-ghost !px-3 !py-1.5 text-xs !text-clay"
              onClick={() => { if (confirm("Delete this event?")) start(async () => { const r = await deleteEventAction(e.id); if (r.ok) { toast.success("Event deleted."); router.refresh(); } }); }}>
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export function CreateEventModal({ city, onClose }: { city: string; onClose: () => void }) {
  useEscClose(onClose);
  const router = useRouter();
  const [pending, start] = useTransition();
  const [petTypes, setPetTypes] = useState<string[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <h2 className="card-title text-lg font-bold">Create an event</h2>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4"
          action={(fd) => {
            fd.set("petTypes", petTypes.join(","));
            start(async () => {
              const r = await createEventAction(fd);
              if (r.ok) { toast.success("Event created."); onClose(); router.refresh(); }
              else toast.error(r.error ?? "Couldn't create event.");
            });
          }}>
          <div>
            <label className="label">Event name</label>
            <input name="title" required minLength={3} maxLength={80} className="field" placeholder="e.g. Saturday morning pack walk" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Category</label>
              <select name="category" className="field">{EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            </div>
            <div>
              <label className="label">Date & time</label>
              <input name="startsAt" type="datetime-local" required className="field" min={new Date(Date.now() - 3600000).toISOString().slice(0, 16)} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">City</label>
              <input name="city" required defaultValue={city} className="field" maxLength={60} />
            </div>
            <div>
              <label className="label">Venue</label>
              <input name="venue" maxLength={80} className="field" placeholder="e.g. Riverside dog park" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[1fr,120px]">
            <div>
              <label className="label">Meeting point / address (shown publicly)</label>
              <input name="address" maxLength={120} className="field" placeholder="e.g. North entrance, Main St 12" />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input name="capacity" type="number" min={1} max={5000} className="field" placeholder="∞" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={3} maxLength={600} className="field resize-none" placeholder="What's the plan? Who's welcome? Bring water?…" />
          </div>
          <div>
            <label className="label">Welcomed pets</label>
            <div className="flex flex-wrap gap-1.5">
              {ANIMAL_TYPES.slice(0, 6).map((a) => (
                <button key={a.value} type="button" className="chip" data-active={petTypes.includes(a.value)}
                  onClick={() => setPetTypes((s) => (s.includes(a.value) ? s.filter((x) => x !== a.value) : [...s, a.value]))}>
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-faint mt-1.5 text-[11px]">None selected = all pets welcome.</p>
          </div>
          <div>
            <label className="label">Event image (optional)</label>
            <button type="button" onClick={() => imgRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/16 bg-white/3 py-5 transition-colors hover:border-accent/40">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-24 w-full rounded-xl object-cover" />
              ) : (
                <><Camera className="text-faint h-4.5 w-4.5" /><span className="text-faint text-xs font-semibold">Add a cover photo</span></>
              )}
            </button>
            <input ref={imgRef} name="image" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImagePreview(URL.createObjectURL(f)); }} />
          </div>
          <div className="flex justify-end gap-2 pb-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CalendarHeart className="h-4 w-4" /> Create event</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateEventTrigger({ city, autoOpen }: { city: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Create event</button>
      {open && <CreateEventModal city={city} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ═══ BUSINESSES ═══════════════════════════ */

export function BusinessCard({ b, isOwner }: { b: Biz; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} className="glass glass-sheen glass-hover animate-rise group w-full overflow-hidden rounded-[26px] text-left">
        <div className="flex items-center gap-3.5 p-4.5">
          <span className="flex h-13 w-13 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-sky/12 border border-white/10">
            {b.imageFileId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/file/${b.imageFileId}`} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="font-display text-lg font-bold text-accent">{b.name[0]}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5">
              <span className="truncate text-[15px] font-bold text-white/93">{b.name}</span>
              {b.verified && <VerifiedBadge />}
            </span>
            <span className="text-dim mt-0.5 block truncate text-xs">{businessCategoryLabel(b.category)} · {b.city}</span>
            {b.emergency && <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-clay/12 border border-clay/30 px-2 py-0.5 text-[10px] font-bold text-clay"><Siren className="h-3 w-3" /> Emergency available</span>}
          </span>
        </div>
      </button>

      {open && (
        <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={() => setOpen(false)}>
          <div className="glass-deep max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] p-5 sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-accent/20 to-sky/12 border border-white/10">
                  {b.imageFileId ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/file/${b.imageFileId}`} alt="" className="h-full w-full object-cover" />
                  ) : <span className="font-display text-xl font-bold text-accent">{b.name[0]}</span>}
                </span>
                <div>
                  <p className="flex items-center gap-1.5 text-lg font-bold text-white/93">{b.name} {b.verified && <VerifiedBadge />}</p>
                  <p className="text-dim text-xs">{businessCategoryLabel(b.category)}</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl shrink-0" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>

            {b.description && <p className="text-dim mt-4 text-sm leading-relaxed">{b.description}</p>}
            {b.services.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">{b.services.map((s) => <span key={s} className="chip !cursor-default">{s}</span>)}</div>
            )}

            <div className="divider my-4" />
            <div className="space-y-2.5 text-sm">
              {b.hours && <p className="flex items-center gap-2.5 text-white/75"><Clock className="text-faint h-4 w-4 shrink-0" /> {b.hours}</p>}
              {b.address && <p className="flex items-center gap-2.5 text-white/75"><MapPin className="text-faint h-4 w-4 shrink-0" /> {b.address}, {b.city}</p>}
              {b.phone && <a href={`tel:${b.phone}`} className="flex items-center gap-2.5 text-white/75 transition-colors hover:text-accent"><Phone className="text-faint h-4 w-4 shrink-0" /> {b.phone}</a>}
              {b.email && <a href={`mailto:${b.email}`} className="flex items-center gap-2.5 text-white/75 transition-colors hover:text-accent"><Mail className="text-faint h-4 w-4 shrink-0" /> {b.email}</a>}
              {b.website && <a href={b.website.startsWith("http") ? b.website : `https://${b.website}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-white/75 transition-colors hover:text-accent"><Globe className="text-faint h-4 w-4 shrink-0" /> Website</a>}
              {b.emergency && <p className="flex items-center gap-2.5 font-semibold text-clay"><Siren className="h-4 w-4 shrink-0" /> Emergency care available</p>}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <a href={mapsUrl(b.address, b.city)} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 text-sm">
                <MapPin className="h-4 w-4" /> Open in Google Maps
              </a>
              {b.phone && <a href={`tel:${b.phone}`} className="btn-ghost text-sm"><Phone className="h-4 w-4" /> Call</a>}
            </div>
            {!b.verified && (
              <p className="text-faint mt-4 text-[11px] leading-relaxed">Not yet verified. Businesses earn the green check after documentation review.</p>
            )}
            {isOwner && (
              <button className="btn-danger mt-4 w-full text-sm"
                onClick={() => { if (confirm("Delete this business profile?")) start(async () => { const r = await deleteBusinessAction(b.id); if (r.ok) { toast.success("Business deleted."); setOpen(false); router.refresh(); } }); }}>
                <Trash2 className="h-4 w-4" /> Delete business profile
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function CreateBusinessModal({ city, onClose }: { city: string; onClose: () => void }) {
  useEscClose(onClose);
  const router = useRouter();
  const [pending, start] = useTransition();
  const imgRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="card-title text-lg font-bold">List your business</h2>
            <p className="text-faint text-xs">Verification (green check) happens after documentation review.</p>
          </div>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl shrink-0" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4"
          action={(fd) => {
            start(async () => {
              const r = await createBusinessAction(fd);
              if (r.ok) { toast.success("Business listed. Verification review can be requested next."); onClose(); router.refresh(); }
              else toast.error(r.error ?? "Couldn't create business.");
            });
          }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Business name</label>
              <input name="name" required minLength={2} maxLength={60} className="field" />
            </div>
            <div>
              <label className="label">Category</label>
              <select name="category" className="field">{BUSINESS_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={2} maxLength={400} className="field resize-none" placeholder="What do you offer, and why do pets love it?" />
          </div>
          <div>
            <label className="label">Services (comma separated)</label>
            <input name="services" maxLength={200} className="field" placeholder="e.g. Consultations, Vaccinations, Surgery" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Hours</label>
              <input name="hours" maxLength={80} className="field" placeholder="e.g. Mon–Fri 9:00–18:00" />
            </div>
            <div>
              <label className="label">Phone</label>
              <input name="phone" type="tel" maxLength={30} className="field" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Email</label>
              <input name="email" type="email" maxLength={80} className="field" />
            </div>
            <div>
              <label className="label">Website</label>
              <input name="website" maxLength={100} className="field" placeholder="example.com" />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Address</label>
              <input name="address" maxLength={120} className="field" placeholder="Street & number" />
            </div>
            <div>
              <label className="label">City</label>
              <input name="city" required defaultValue={city} maxLength={60} className="field" />
            </div>
          </div>
          <label className="flex items-center gap-2.5 rounded-2xl border border-white/8 bg-white/3 px-4 py-3">
            <input name="emergency" type="checkbox" className="h-4 w-4 accent-emerald-500" />
            <span className="text-sm text-white/80">We offer emergency care</span>
          </label>
          <div>
            <label className="label">Photo / logo</label>
            <button type="button" onClick={() => imgRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/16 bg-white/3 py-5 transition-colors hover:border-accent/40">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                <><Camera className="text-faint h-4.5 w-4.5" /><span className="text-faint text-xs font-semibold">Upload image</span></>
              )}
            </button>
            <input ref={imgRef} name="image" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImagePreview(URL.createObjectURL(f)); }} />
          </div>
          <div className="flex justify-end gap-2 pb-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "List business"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateBusinessTrigger({ city, autoOpen }: { city: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> List a business</button>
      {open && <CreateBusinessModal city={city} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ═══ ADOPTION ═════════════════════════════ */

export function AdoptionCard({ a, isOwner }: { a: Adoption; isOwner: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <>
      <button onClick={() => setOpen(true)} className="glass glass-sheen glass-hover group w-full overflow-hidden rounded-[26px] text-left animate-rise">
        <div className="relative aspect-[4/3] bg-black/30">
          {a.imageFileId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/api/file/${a.imageFileId}`} alt={a.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
          ) : (
            <div className="flex h-full items-center justify-center"><HeartHandshake className="text-faint h-8 w-8" /></div>
          )}
          <div className="on-dark absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-3.5 pt-10">
            <p className="font-display text-lg font-bold text-white">{a.name}</p>
            <p className="text-[11px] text-white/70">{animalLabel(a.animalType)}{a.breed ? ` · ${a.breed}` : ""}{a.ageText ? ` · ${a.ageText}` : ""}</p>
          </div>
          {a.status === "adopted" && (
            <span className="absolute left-3 top-3 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold text-on-accent">Adopted!</span>
          )}
        </div>
      </button>

      {open && (
        <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={() => setOpen(false)}>
          <div className="glass-deep max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="relative aspect-[16/10] bg-black/30">
              {a.imageFileId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/api/file/${a.imageFileId}`} alt={a.name} className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center"><HeartHandshake className="text-faint h-10 w-10" /></div>}
              <button onClick={() => setOpen(false)} className="on-dark glass-hair absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl !border-white/20 !bg-black/40 !text-white backdrop-blur-md" aria-label="Close"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <h3 className="card-title text-xl font-bold text-white/95">{a.name}</h3>
              <p className="text-dim mt-1 text-sm">
                {animalLabel(a.animalType)}{a.breed ? ` · ${a.breed}` : ""}{a.ageText ? ` · ${a.ageText}` : ""}{a.gender ? ` · ${a.gender}` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-white/55"><MapPin className="h-3.5 w-3.5 text-clay" />{a.city}</p>
              {a.description && <p className="text-dim mt-4 text-sm leading-relaxed">{a.description}</p>}
              {a.status === "available" ? (
                <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/8 p-4">
                  <p className="text-xs font-bold text-accent">Interested in adopting {a.name}?</p>
                  <p className="mt-1 break-all text-sm text-white/85">{a.contact}</p>
                  <p className="text-faint mt-2 text-[11px]">Reach out directly — Pawkind never charges adoption fees through the app.</p>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-accent/25 bg-accent/8 p-4 text-center">
                  <p className="text-sm font-bold text-accent">{a.name} found a home!</p>
                </div>
              )}
              {isOwner && (
                <div className="mt-4 flex gap-2">
                  {a.status === "available" ? (
                    <button className="btn-ghost flex-1 text-sm" onClick={() => start(async () => { const r = await setAdoptionStatusAction(a.id, "adopted"); if (r.ok) { toast.success("Marked as adopted — congrats!"); setOpen(false); router.refresh(); } })}>
                      <Check className="h-4 w-4" /> Mark as adopted
                    </button>
                  ) : (
                    <button className="btn-ghost flex-1 text-sm" onClick={() => start(async () => { const r = await setAdoptionStatusAction(a.id, "available"); if (r.ok) { setOpen(false); router.refresh(); } })}>
                      Relist as available
                    </button>
                  )}
                  <button className="btn-danger text-sm" onClick={() => { if (confirm("Delete this listing?")) start(async () => { const r = await deleteAdoptionAction(a.id); if (r.ok) { setOpen(false); router.refresh(); } }); }}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function CreateAdoptionModal({ city, onClose }: { city: string; onClose: () => void }) {
  useEscClose(onClose);
  const router = useRouter();
  const [pending, start] = useTransition();
  const imgRef = useRef<HTMLInputElement>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  return (
    <div className="modal-veil fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4 animate-fade" onClick={onClose}>
      <div className="glass-deep flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[26px] sm:rounded-[26px] animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-white/7 px-5 py-4">
          <div>
            <h2 className="card-title text-lg font-bold">Help a pet find a home</h2>
            <p className="text-faint text-xs">Only list pets you're authorized to rehome (your own or via a shelter/rescue).</p>
          </div>
          <button onClick={onClose} className="glass-hair flex h-8 w-8 items-center justify-center rounded-xl shrink-0" aria-label="Close"><X className="h-4 w-4" /></button>
        </div>
        <form className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 py-4"
          action={(fd) => {
            start(async () => {
              const r = await createAdoptionListingAction(fd);
              if (r.ok) { toast.success("Listing published."); onClose(); router.refresh(); }
              else toast.error(r.error ?? "Couldn't create listing.");
            });
          }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Pet's name</label>
              <input name="name" required maxLength={40} className="field" />
            </div>
            <div>
              <label className="label">Animal</label>
              <select name="animalType" className="field">{ANIMAL_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="label">Breed</label>
              <input name="breed" maxLength={50} className="field" placeholder="Optional" />
            </div>
            <div>
              <label className="label">Age</label>
              <input name="ageText" maxLength={20} className="field" placeholder="e.g. 8 months" />
            </div>
            <div>
              <label className="label">Gender</label>
              <select name="gender" className="field"><option value="">—</option><option value="female">Female</option><option value="male">Male</option></select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea name="description" rows={3} maxLength={600} className="field resize-none" placeholder="Temperament, health status, ideal home, what's included…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">City</label>
              <input name="city" required defaultValue={city} maxLength={60} className="field" />
            </div>
            <div>
              <label className="label">Contact (email or phone)</label>
              <input name="contact" required maxLength={80} className="field" placeholder="Only shown on the listing" />
            </div>
          </div>
          <div>
            <label className="label">Photo</label>
            <button type="button" onClick={() => imgRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-white/16 bg-white/3 py-5 transition-colors hover:border-accent/40">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="" className="h-24 w-full rounded-xl object-cover" />
              ) : (
                <><Camera className="text-faint h-4.5 w-4.5" /><span className="text-faint text-xs font-semibold">Add a photo — it helps a lot</span></>
              )}
            </button>
            <input ref={imgRef} name="image" type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setImagePreview(URL.createObjectURL(f)); }} />
          </div>
          <div className="flex justify-end gap-2 pb-2">
            <button type="button" onClick={onClose} className="btn-ghost text-sm">Cancel</button>
            <button type="submit" disabled={pending} className="btn-primary text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Publish listing"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function CreateAdoptionTrigger({ city, autoOpen }: { city: string; autoOpen?: boolean }) {
  const [open, setOpen] = useState(Boolean(autoOpen));
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary text-sm"><Plus className="h-4 w-4" /> Create listing</button>
      {open && <CreateAdoptionModal city={city} onClose={() => setOpen(false)} />}
    </>
  );
}
