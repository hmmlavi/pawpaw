import { getActiveContext } from "@/lib/auth";
import { loadFeed, loadStories, loadExplore, toPetLite } from "@/lib/queries";
import { formatEventDate, formatEventTime, mapsUrl, eventCategoryLabel, isBirthdayToday } from "@/lib/utils";
import { PostCard, StoriesRail, AuthorRow } from "@/components/feed";
import { EmptyState, SectionHeader } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Feather, Sparkles, CalendarHeart, ArrowRight, Cake, MapPin, HeartHandshake, ClipboardPlus, Stethoscope } from "lucide-react";
import { FollowButton } from "@/components/social-buttons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Home" };

export default async function HomePage() {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const pet = ctx.activePet;
  const me = toPetLite(pet);

  const [feed, stories, explore] = await Promise.all([
    loadFeed(pet.id),
    loadStories(pet.id),
    loadExplore(pet.id, pet.city),
  ]);

  const bday = isBirthdayToday(pet.birthday);
  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Up late" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr),340px]">
      {/* ── Main column ─────────────────────────── */}
      <div className="min-w-0">
        {/* greeting */}
        <header className="mb-4 animate-rise">
          <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">{greeting}</p>
          <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">
            {pet.name}<span className="text-accent">'s world</span>
          </h1>
          <p className="text-dim text-sm">{pet.city} · managed by {ctx.user.displayName}</p>
        </header>

        {bday && (
          <div className="glass glass-sheen mb-4 flex items-center gap-3.5 rounded-3xl border-clay/25 bg-gradient-to-r from-clay/10 to-sand/5 p-4 animate-rise">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-clay/15 border border-clay/30 animate-pulse-ring">
              <Cake className="h-5 w-5 text-clay" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white/92">It's {pet.name}'s birthday today!</p>
              <p className="text-dim text-xs">Their profile has a birthday badge, banner and special story ring today.</p>
            </div>
          </div>
        )}

        {/* stories */}
        <StoriesRail groups={stories} me={me} city={pet.city} />

        {/* feed */}
        <div className="mt-2 space-y-5">
          {feed.length === 0 ? (
            <EmptyState
              icon={Feather}
              title="Your feed starts here"
              body="Follow pets you love, and their moments will fill this space. Start with Explore to find your pet's first friends."
              actionHref="/explore"
              actionLabel="Discover pets"
            />
          ) : (
            feed.map((post) => <PostCard key={post.id} post={post} me={me} meOwner={ctx.user.displayName} />)
          )}
        </div>
      </div>

      {/* ── Spatial aside ────────────────────────── */}
      <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        {/* AI quick access */}
        <Link href="/ai" className="glass-deep glass-sheen glass-hover group block overflow-hidden rounded-3xl p-5 animate-rise" style={{ animationDelay: "60ms" }}>
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky/25 to-accent/15 border border-white/10">
              <Sparkles className="h-5 w-5 text-sky" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold text-white/92">Ask the pet assistant</p>
              <p className="text-faint text-xs">Health · behavior · training · nutrition</p>
            </div>
            <ArrowRight className="text-faint h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1 group-hover:text-accent" />
          </div>
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {[`Is chocolate safe for ${pet.animalType === "dog" ? "dogs" : "my pet"}?`, "Leash training basics", "How much sleep?"].map((q) => (
              <span key={q} className="chip !cursor-pointer !py-1.5 text-[11px]">{q}</span>
            ))}
          </div>
        </Link>

        {/* pets to follow */}
        <section className="animate-rise" style={{ animationDelay: "120ms" }}>
          <SectionHeader title="New friends for your pet" href="/explore" linkLabel="Explore" />
          <div className="glass rounded-3xl p-2">
            {explore.suggested.length === 0 ? (
              <p className="text-faint px-3 py-5 text-center text-xs leading-relaxed">
                Your pet's circle starts here.<br />New pets in the community will appear as they join.
              </p>
            ) : (
              explore.suggested.slice(0, 4).map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-2xl px-2 py-2 transition-colors hover:bg-white/4">
                  <AuthorRow pet={p} size="sm" sub={p.city ? `${p.city}` : `@${p.username}`} />
                  <div className="ml-auto shrink-0"><FollowButton targetId={p.id} compact /></div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* events */}
        <section className="animate-rise" style={{ animationDelay: "180ms" }}>
          <SectionHeader title="Happening near you" sub={pet.city || undefined} href="/events" linkLabel="All events" />
          <div className="glass space-y-1 rounded-3xl p-2">
            {explore.localEvents.length === 0 ? (
              <div className="px-3 py-5 text-center">
                <CalendarHeart className="text-faint mx-auto mb-2 h-5 w-5" />
                <p className="text-faint text-xs leading-relaxed">Nothing nearby yet.<br />Host the first walk in {pet.city || "your city"}.</p>
                <Link href="/events?create=1" className="btn-ghost mt-3 !px-3.5 !py-1.5 text-xs">Create an event</Link>
              </div>
            ) : (
              explore.localEvents.slice(0, 3).map((e) => (
                <Link key={e.id} href="/events" className="flex items-center gap-3 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-white/4">
                  <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-sand/12 border border-sand/25 text-sand">
                    <span className="text-[13px] font-bold leading-none">{new Date(e.startsAt).getDate()}</span>
                    <span className="text-[9px] font-bold uppercase">{new Date(e.startsAt).toLocaleDateString("en-US", { month: "short" })}</span>
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-white/90">{e.title}</span>
                    <span className="text-faint block truncate text-[11px]">{eventCategoryLabel(e.category)} · {formatEventTime(e.startsAt)}{e.venue ? ` · ${e.venue}` : ""}</span>
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>

        {/* adoption */}
        <section className="animate-rise" style={{ animationDelay: "240ms" }}>
          <SectionHeader title="Looking for a home" href="/adoption" linkLabel="Adoption" />
          <div className="glass rounded-3xl p-4">
            {explore.localAdoptions.length === 0 ? (
              <div className="text-center">
                <HeartHandshake className="text-faint mx-auto mb-2 h-5 w-5" />
                <p className="text-faint text-xs leading-relaxed">No adoptable pets listed in {pet.city || "your city"} yet. Verified rescues will appear here.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {explore.localAdoptions.slice(0, 2).map((a) => (
                  <Link key={a.id} href="/adoption" className="group overflow-hidden rounded-2xl border border-white/8 bg-white/3">
                    <div className="aspect-square bg-black/30">
                      {a.imageFileId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`/api/file/${a.imageFileId}`} alt={a.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center"><HeartHandshake className="text-faint h-6 w-6" /></div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="truncate text-xs font-bold text-white/90">{a.name}</p>
                      <p className="text-faint truncate text-[10px]">{a.city}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* health / clinics */}
        <div className="grid grid-cols-2 gap-3 animate-rise" style={{ animationDelay: "300ms" }}>
          <Link href="/health" className="glass glass-hover flex flex-col gap-2 rounded-2xl p-3.5">
            <ClipboardPlus className="h-4.5 w-4.5 text-clay" />
            <span className="text-xs font-bold text-white/85">Health vault</span>
            <span className="text-faint text-[10px] leading-snug">Private records for {pet.name}</span>
          </Link>
          <Link href="/services?cat=clinic" className="glass glass-hover flex flex-col gap-2 rounded-2xl p-3.5">
            <Stethoscope className="h-4.5 w-4.5 text-accent" />
            <span className="text-xs font-bold text-white/85">Find a vet</span>
            <span className="text-faint text-[10px] leading-snug">Clinics in {pet.city || "your city"}</span>
          </Link>
        </div>
      </aside>
    </div>
  );
}
