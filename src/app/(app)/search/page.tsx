import { getActiveContext } from "@/lib/auth";
import { db } from "@/db";
import { pets, posts, businesses, events } from "@/db/schema";
import * as Q from "@/lib/queries";
import { and, asc, desc, eq, gt, ilike, ne, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SearchInput } from "@/components/search";
import { AuthorRow, PostCard } from "@/components/feed";
import { FollowButton } from "@/components/social-buttons";
import { BusinessCard } from "@/components/local";
import { EventCard } from "@/components/local";
import { EmptyState, SectionHeader } from "@/components/ui";
import { Search, MapPin, CalendarHeart, Store, Compass } from "lucide-react";
import { formatEventDate, formatEventTime, animalLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Search" };

const TABS = [
  { id: "pets", label: "Pets" },
  { id: "content", label: "Content" },
  { id: "places", label: "Places & businesses" },
  { id: "events", label: "Events" },
] as const;

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string; tab?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const tab = sp.tab ?? "pets";
  const me = Q.toPetLite(ctx.activePet);

  let petResults: ReturnType<typeof Q.toPetLite>[] = [];
  let contentResults: Awaited<ReturnType<typeof Q.serializePosts>> = [];
  let bizResults: typeof businesses.$inferSelect[] = [];
  let eventResults: typeof events.$inferSelect[] = [];

  if (q) {
    const pattern = `%${q}%`;
    const hashtag = q.startsWith("#") ? q.slice(1) : null;

    if (tab === "pets") {
      const rows = await db.select().from(pets).where(
        and(ne(pets.id, ctx.activePet.id), or(
          ilike(pets.name, pattern), ilike(pets.username, pattern),
          ilike(pets.breed, pattern), ilike(pets.city, pattern), ilike(pets.customAnimal, pattern),
        )),
      ).limit(24);
      petResults = rows.map(Q.toPetLite);
    } else if (tab === "content") {
      const cond = hashtag
        ? ilike(posts.caption, `%#${hashtag}%`)
        : q.startsWith("@")
        ? ilike(posts.caption, `${q.toLowerCase()}%`)
        : ilike(posts.caption, pattern);
      const rows = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
        .where(and(eq(pets.isPrivate, false), ne(posts.kind, "story"), cond))
        .orderBy(desc(posts.createdAt)).limit(30);
      contentResults = await Q.serializePosts(rows, ctx.activePet.id);
    } else if (tab === "places") {
      bizResults = await db.select().from(businesses)
        .where(or(ilike(businesses.name, pattern), ilike(businesses.city, pattern), ilike(businesses.description, pattern)))
        .orderBy(desc(businesses.verified), desc(businesses.createdAt)).limit(30);
    } else if (tab === "events") {
      const now = new Date();
      eventResults = await db.select().from(events)
        .where(and(gt(events.startsAt, now), or(ilike(events.title, pattern), ilike(events.city, pattern), ilike(events.category, pattern))))
        .orderBy(asc(events.startsAt)).limit(30);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Find anything</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Search</h1>
      </header>

      <SearchInput initial={q} tab={tab} />

      {/* tabs */}
      <div className="no-scrollbar -mx-3 mt-4 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <Link key={t.id} href={`/search?q=${encodeURIComponent(q)}&tab=${t.id}`} className="chip shrink-0 !py-2" data-active={tab === t.id}>{t.label}</Link>
        ))}
      </div>

      <div className="mt-5">
        {!q ? (
          <div className="space-y-5">
            <EmptyState
              icon={Search}
              title="Search pets, breeds, cities, places, events"
              body="Try a pet's name or @username, a breed like “corgi”, your city, a hashtag like #beachday, or a clinic's name."
            />
            <div className="glass glass-sheen rounded-3xl p-5 animate-rise">
              <p className="text-faint mb-3 text-[10px] font-bold uppercase tracking-[0.16em]">Jump to</p>
              <div className="flex flex-wrap gap-2">
                <Link href="/explore" className="chip !py-2"><Compass className="h-3.5 w-3.5 text-accent" /> Explore</Link>
                <Link href="/events" className="chip !py-2"><CalendarHeart className="h-3.5 w-3.5 text-sand" /> Events in {ctx.activePet.city || "your city"}</Link>
                <Link href="/services?cat=clinic" className="chip !py-2"><Store className="h-3.5 w-3.5 text-sky" /> Find a vet</Link>
                <Link href="/adoption" className="chip !py-2"><MapPin className="h-3.5 w-3.5 text-clay" /> Adoption near you</Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-fade">
            {tab === "pets" && (
              petResults.length === 0 ? (
                <EmptyState icon={Search} title={`No pets match “${q}”`} body="Try a different name, @username, breed or city. New pets appear as they join." />
              ) : (
                <div className="glass space-y-0.5 rounded-3xl p-1.5">
                  {petResults.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 rounded-2xl px-2.5 py-2.5 transition-colors hover:bg-white/4">
                      <AuthorRow pet={p} sub={`${animalLabel(p.animalType)}${p.city ? ` · ${p.city}` : ""}`} />
                      <div className="ml-auto"><FollowButton targetId={p.id} compact /></div>
                    </div>
                  ))}
                </div>
              )
            )}

            {tab === "content" && (
              contentResults.length === 0 ? (
                <EmptyState icon={Search} title={`No content matches “${q}”`} body="Posts and captions from public pets will show up here." />
              ) : (
                <div className="mx-auto max-w-xl space-y-5">
                  {contentResults.map((post) => <PostCard key={post.id} post={post} me={me} meOwner={ctx.user.displayName} />)}
                </div>
              )
            )}

            {tab === "places" && (
              bizResults.length === 0 ? (
                <EmptyState icon={Store} title={`No businesses match “${q}”`} body="Clinics, groomers, trainers and shops will appear as they're listed." />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {bizResults.map((b) => <BusinessCard key={b.id} b={b} isOwner={b.ownerUserId === ctx.user.id} />)}
                </div>
              )
            )}

            {tab === "events" && (
              eventResults.length === 0 ? (
                <EmptyState icon={CalendarHeart} title={`No events match “${q}”`} body="Try another name, category or city." />
              ) : (
                <div className="glass space-y-0.5 rounded-3xl p-1.5">
                  {eventResults.map((e) => (
                    <Link key={e.id} href="/events" className="flex items-center gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-white/4">
                      <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-sand/12 border border-sand/25 text-sand">
                        <span className="text-[13px] font-bold leading-none">{new Date(e.startsAt).getDate()}</span>
                        <span className="text-[9px] font-bold uppercase">{new Date(e.startsAt).toLocaleDateString("en-US", { month: "short" })}</span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-white/90">{e.title}</span>
                        <span className="text-faint block truncate text-[11px]">{formatEventDate(e.startsAt)} · {formatEventTime(e.startsAt)} · {e.city}</span>
                      </span>
                    </Link>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
