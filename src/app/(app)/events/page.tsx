import { getActiveContext } from "@/lib/auth";
import { db } from "@/db";
import { events, eventAttendees } from "@/db/schema";
import { and, asc, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { EventCard, CreateEventTrigger } from "@/components/local";
import { EmptyState, SectionHeader } from "@/components/ui";
import { CalendarHeart, MapPin } from "lucide-react";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Events" };

export default async function EventsPage({ searchParams }: { searchParams: Promise<{ city?: string; create?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const sp = await searchParams;
  const city = sp.city ?? ctx.activePet.city;
  const now = new Date();

  const rows = await db.select().from(events).where(gt(events.startsAt, now)).orderBy(asc(events.startsAt)).limit(60);

  // same city → nearby-ish (other cities can show under "Further afield")
  const local = rows.filter((e) => city && e.city.toLowerCase() === city.toLowerCase());
  const wider = rows.filter((e) => !(city && e.city.toLowerCase() === city.toLowerCase()));

  const allIds = rows.map((e) => e.id);
  const attendees = allIds.length
    ? await db.select({ eventId: eventAttendees.eventId, status: eventAttendees.status, petId: eventAttendees.petId, n: sql<number>`count(*)::int` })
        .from(eventAttendees).where(inArray(eventAttendees.eventId, allIds)).groupBy(eventAttendees.eventId, eventAttendees.status, eventAttendees.petId)
    : [];

  const meta = (id: string) => {
    const forEvent = attendees.filter((a) => a.eventId === id);
    const mine = forEvent.find((a) => a.petId === ctx.activePet!.id);
    return {
      going: forEvent.filter((a) => a.status === "going").length,
      interested: forEvent.filter((a) => a.status === "interested").length,
      mine: (mine?.status as "going" | "interested" | undefined) ?? "none" as const,
    };
  };

  const renderGrid = (list: typeof rows) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {list.map((e) => {
        const m = meta(e.id);
        return <EventCard key={e.id} event={e} myState={m.mine} goingCount={m.going} interestedCount={m.interested} isOwner={e.creatorUserId === ctx.user.id} />;
      })}
    </div>
  );

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-rise">
        <div>
          <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Community</p>
          <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Events & meetups</h1>
          <p className="text-dim mt-0.5 flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-clay" /> {city || "Everywhere"}</p>
        </div>
        <CreateEventTrigger city={city || ""} autoOpen={sp.create === "1"} />
      </header>

      <section className="mb-8">
        <SectionHeader title={city ? `In ${city}` : "Upcoming"} sub="Meetups, walks, parties & adoption events" />
        {local.length === 0 ? (
          <EmptyState
            icon={CalendarHeart}
            title="Nothing nearby yet"
            body={`Be the first to bring ${city || "your city"}'s pets together — a park walk, a birthday, a beach meetup.`}
          >
            <div className="mt-5"><CreateEventTrigger city={city || ""} /></div>
          </EmptyState>
        ) : renderGrid(local)}
      </section>

      {wider.length > 0 && (
        <section>
          <SectionHeader title="Further afield" sub="Events in other cities" />
          {renderGrid(wider)}
        </section>
      )}
    </div>
  );
}
