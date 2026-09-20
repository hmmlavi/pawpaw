import { getActiveContext } from "@/lib/auth";
import { loadExplore, toPetLite } from "@/lib/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Compass, Search, Clapperboard, CalendarHeart, Store, HeartHandshake, MapPin, TrendingUp, Sparkles } from "lucide-react";
import { SectionHeader, EmptyState, PetAvatar } from "@/components/ui";
import { FollowButton } from "@/components/social-buttons";
import { AuthorRow } from "@/components/feed";
import { eventCategoryLabel, businessCategoryLabel, formatEventDate, formatEventTime, animalLabel } from "@/lib/utils";
import { VerifiedBadge } from "@/components/pet-identity";

export const dynamic = "force-dynamic";
export const metadata = { title: "Explore" };

const CATS = [
  { label: "For You", href: "#for-you", icon: Sparkles },
  { label: "Pets", href: "#pets", icon: Compass },
  { label: "Reels", href: "/reels", icon: Clapperboard },
  { label: "Local", href: "#local", icon: MapPin },
  { label: "Events", href: "/events", icon: CalendarHeart },
  { label: "Services", href: "/services", icon: Store },
  { label: "Adoption", href: "/adoption", icon: HeartHandshake },
  { label: "Trending", href: "#for-you", icon: TrendingUp },
];

export default async function ExplorePage() {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const explore = await loadExplore(ctx.activePet.id, ctx.activePet.city);

  return (
    <div>
      <header className="mb-4 animate-rise">
        <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Discovery space</p>
        <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Explore</h1>
        <p className="text-dim text-sm">Pets, places and communities — tuned to {ctx.activePet.name}'s world.</p>
      </header>

      {/* search entry */}
      <Link href="/search" className="glass glass-sheen glass-hover mb-5 flex items-center gap-3 rounded-2xl px-4 py-3.5 animate-rise">
        <Search className="text-faint h-4.5 w-4.5" />
        <span className="text-sm text-white/35">Search pets, breeds, cities, places, events, hashtags…</span>
      </Link>

      {/* category rail */}
      <div className="no-scrollbar -mx-3 mb-6 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {CATS.map((c) => (
          <Link key={c.label} href={c.href} className="chip shrink-0 !py-2">
            <c.icon className="h-3.5 w-3.5" /> {c.label}
          </Link>
        ))}
      </div>

      {/* pets */}
      <section id="pets" className="mb-8 scroll-mt-24">
        <SectionHeader title="Pets to meet" sub="New identities in the community" />
        {explore.suggested.length === 0 ? (
          <EmptyState icon={Compass} title="Discover pets, places and communities as they appear"
            body="As the community grows around you, new pets will surface here — organized around your pet's species, interests and city." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {explore.suggested.slice(0, 5).map((p, i) => (
              <div key={p.id} className="glass glass-sheen glass-hover animate-rise relative flex flex-col items-center rounded-3xl px-3 pb-4 pt-6 text-center" style={{ animationDelay: `${i * 50}ms` }}>
                <Link href={`/profile/${p.username}`} className="flex flex-col items-center">
                  <PetAvatar avatarFileId={p.avatar ? p.avatar.replace("/api/file/", "") : null} name={p.name} icon={p.icon} size="lg" />
                  <p className="mt-2.5 max-w-full truncate text-sm font-bold text-white/92">{p.name}</p>
                  <p className="text-faint max-w-full truncate text-[11px]">{animalLabel(p.animalType)} · {p.city || "somewhere warm"}</p>
                </Link>
                <FollowButton targetId={p.id} compact className="mt-3" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* for you — spatial mosaic */}
      <section id="for-you" className="mb-8 scroll-mt-24">
        <SectionHeader title="For you" sub="Fresh moments from the community" />
        {explore.forYou.length === 0 ? (
          <EmptyState icon={Sparkles} title="The community canvas is fresh"
            body="Posts from pets across Pawkind will appear here. When your pet shares their first photo, it joins the tapestry." />
        ) : (
          <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 [&>*]:mb-3">
            {explore.forYou.map((post, i) => (
              <Link key={post.id} href={`/profile/${post.author.username}`}
                className="group glass animate-rise relative block overflow-hidden rounded-3xl break-inside-avoid transition-transform duration-500 hover:-translate-y-1"
                style={{ animationDelay: `${(i % 8) * 40}ms` }}>
                <div className={i % 5 === 0 ? "aspect-[4/5]" : i % 5 === 1 ? "aspect-square" : i % 5 === 2 ? "aspect-[3/4]" : i % 5 === 3 ? "aspect-[4/3]" : "aspect-[5/6]"}>
                  {post.media[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={post.media[0].url} alt="" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent/20 via-ink-3 to-sky/15 p-4">
                      <p className="line-clamp-4 text-center font-display text-sm font-semibold text-white/85">{post.caption}</p>
                    </div>
                  )}
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-3 pt-10 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                  <p className="truncate text-xs font-bold text-white">{post.author.name}</p>
                  <p className="truncate text-[10px] text-white/60">@{post.author.username}{post.location ? ` · ${post.location}` : ""}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* local strip */}
      <section id="local" className="mb-8 scroll-mt-24">
        <SectionHeader title={`Local in ${ctx.activePet.city || "your city"}`} sub="Events, services and neighbors" href="/events" linkLabel="Events" />
        <div className="grid gap-3 md:grid-cols-3">
          {/* event card */}
          <div className="glass glass-sheen rounded-3xl p-4 animate-rise">
            <div className="mb-3 flex items-center gap-2"><CalendarHeart className="h-4 w-4 text-sand" /><span className="text-xs font-bold uppercase tracking-wider text-sand/90">Next event</span></div>
            {explore.localEvents.length === 0 ? (
              <p className="text-faint py-4 text-center text-xs leading-relaxed">Nothing nearby yet.<br /><Link href="/events?create=1" className="text-accent font-semibold hover:underline">Host the first one →</Link></p>
            ) : (
              (() => { const e = explore.localEvents[0]; return (
                <Link href="/events" className="block">
                  <p className="truncate text-sm font-bold text-white/92">{e.title}</p>
                  <p className="text-dim mt-1 text-xs">{formatEventDate(e.startsAt)} · {formatEventTime(e.startsAt)}</p>
                  <p className="text-faint mt-0.5 truncate text-xs">{e.venue || e.city}</p>
                  <span className="chip mt-3 !py-1 text-[10px]">{eventCategoryLabel(e.category)}</span>
                </Link>
              ); })()
            )}
          </div>
          {/* service card */}
          <div className="glass glass-sheen rounded-3xl p-4 animate-rise" style={{ animationDelay: "60ms" }}>
            <div className="mb-3 flex items-center gap-2"><Store className="h-4 w-4 text-accent" /><span className="text-xs font-bold uppercase tracking-wider text-accent/90">Services</span></div>
            {explore.localBusinesses.length === 0 ? (
              <p className="text-faint py-4 text-center text-xs leading-relaxed">No local businesses listed yet.<br /><Link href="/services?create=1" className="text-accent font-semibold hover:underline">List yours →</Link></p>
            ) : (
              (() => { const b = explore.localBusinesses[0]; return (
                <Link href="/services" className="block">
                  <span className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-bold text-white/92">{b.name}</p>
                    {b.verified && <VerifiedBadge />}
                  </span>
                  <p className="text-dim mt-1 text-xs">{businessCategoryLabel(b.category)}</p>
                  <p className="text-faint mt-0.5 truncate text-xs">{b.city}</p>
                  <span className="chip mt-3 !py-1 text-[10px]">{explore.localBusinesses.length} listed</span>
                </Link>
              ); })()
            )}
          </div>
          {/* adoption card */}
          <div className="glass glass-sheen rounded-3xl p-4 animate-rise" style={{ animationDelay: "120ms" }}>
            <div className="mb-3 flex items-center gap-2"><HeartHandshake className="h-4 w-4 text-clay" /><span className="text-xs font-bold uppercase tracking-wider text-clay/90">Adoption</span></div>
            {explore.localAdoptions.length === 0 ? (
              <p className="text-faint py-4 text-center text-xs leading-relaxed">No listings nearby yet.<br /><Link href="/adoption?create=1" className="text-accent font-semibold hover:underline">Help a pet →</Link></p>
            ) : (
              (() => { const a = explore.localAdoptions[0]; return (
                <Link href="/adoption" className="block">
                  <p className="truncate text-sm font-bold text-white/92">{a.name} needs a home</p>
                  <p className="text-dim mt-1 text-xs">{animalLabel(a.animalType)}{a.ageText ? ` · ${a.ageText}` : ""}</p>
                  <p className="text-faint mt-0.5 truncate text-xs">{a.city}</p>
                  <span className="chip mt-3 !py-1 text-[10px]">{explore.localAdoptions.length} waiting</span>
                </Link>
              ); })()
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
