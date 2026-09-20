import { getActiveContext } from "@/lib/auth";
import { db } from "@/db";
import { businesses } from "@/db/schema";
import { desc, ilike } from "drizzle-orm";
import { BusinessCard, CreateBusinessTrigger } from "@/components/local";
import { EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Store, MapPin } from "lucide-react";
import { BUSINESS_CATEGORIES, businessCategoryLabel, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Services & clinics" };

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ cat?: string; city?: string; create?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const sp = await searchParams;
  const city = sp.city ?? ctx.activePet.city;
  const cat = sp.cat ?? "all";

  const rows = city
    ? await db.select().from(businesses).where(ilike(businesses.city, city)).orderBy(desc(businesses.verified), desc(businesses.createdAt)).limit(60)
    : await db.select().from(businesses).orderBy(desc(businesses.verified), desc(businesses.createdAt)).limit(60);

  const mine = rows.filter((b) => b.ownerUserId === ctx.user.id);
  const filtered = cat === "all" ? rows : rows.filter((b) => b.category === cat);
  const clinics = filtered.filter((b) => b.category === "clinic");

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-rise">
        <div>
          <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Care & services</p>
          <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Services & clinics</h1>
          <p className="text-dim mt-0.5 flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-clay" /> {city || "Everywhere"}</p>
        </div>
        <CreateBusinessTrigger city={city || ""} autoOpen={sp.create === "1"} />
      </header>

      {/* category rail */}
      <div className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        <Link href="/services" className="chip shrink-0 !py-2" data-active={cat === "all"}>All</Link>
        {BUSINESS_CATEGORIES.map((c) => (
          <Link key={c.value} href={`/services?cat=${c.value}`} className="chip shrink-0 !py-2" data-active={cat === c.value}>{c.label}</Link>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Store}
          title={cat === "clinic" ? "No clinics listed yet" : "No businesses here yet"}
          body={`When ${cat === "all" ? "groomers, trainers, shops and clinics" : businessCategoryLabel(cat).toLowerCase() + "s"} join ${city || "the platform"}, they'll appear here with directions and contact.`}
        >
          <div className="mt-5"><CreateBusinessTrigger city={city || ""} /></div>
        </EmptyState>
      ) : (
        <>
          {cat === "all" && clinics.length > 0 && (
            <section className="mb-6">
              <h2 className="card-title mb-3 px-1 text-[17px] font-semibold text-white/92">Veterinary clinics</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {clinics.map((b) => <BusinessCard key={b.id} b={b} isOwner={b.ownerUserId === ctx.user.id} />)}
              </div>
            </section>
          )}
          <section>
            {cat === "all" && <h2 className="card-title mb-3 px-1 text-[17px] font-semibold text-white/92">All services</h2>}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {(cat === "all" ? filtered.filter((b) => b.category !== "clinic") : filtered).map((b) => (
                <BusinessCard key={b.id} b={b} isOwner={b.ownerUserId === ctx.user.id} />
              ))}
            </div>
          </section>
        </>
      )}

      {mine.length > 0 && (
        <p className="text-faint mt-6 text-center text-xs">You manage {mine.length} {mine.length === 1 ? "business" : "businesses"}. Request verification review after listing to earn the green check.</p>
      )}
    </div>
  );
}
