import { getActiveContext } from "@/lib/auth";
import { db } from "@/db";
import { adoptions } from "@/db/schema";
import { desc, eq, ilike } from "drizzle-orm";
import { AdoptionCard, CreateAdoptionTrigger } from "@/components/local";
import { EmptyState } from "@/components/ui";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HeartHandshake, MapPin, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Adoption & rescue" };

const ANIMAL_FILTERS = ["all", "dog", "cat", "bird", "rabbit", "other"] as const;

export default async function AdoptionPage({ searchParams }: { searchParams: Promise<{ animal?: string; city?: string; create?: string }> }) {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");
  const sp = await searchParams;
  const city = sp.city ?? ctx.activePet.city;
  const animal = sp.animal ?? "all";

  const rows = city
    ? await db.select().from(adoptions).where(ilike(adoptions.city, city)).orderBy(desc(adoptions.createdAt)).limit(60)
    : await db.select().from(adoptions).orderBy(desc(adoptions.createdAt)).limit(60);

  const available = rows.filter((a) => a.status === "available");
  const matched = animal === "all" ? available : available.filter((a) => a.animalType === animal);
  const adopted = rows.filter((a) => a.status === "adopted").slice(0, 6);

  return (
    <div>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3 animate-rise">
        <div>
          <p className="text-faint text-[11px] font-semibold uppercase tracking-[0.18em]">Rescue ecosystem</p>
          <h1 className="card-title mt-1 text-[26px] font-bold leading-tight text-white/95">Adoption & rescue</h1>
          <p className="text-dim mt-0.5 flex items-center gap-1 text-sm"><MapPin className="h-3.5 w-3.5 text-clay" /> {city || "Everywhere"}</p>
        </div>
        <CreateAdoptionTrigger city={city || ""} autoOpen={sp.create === "1"} />
      </header>

      <div className="glass glass-sheen mb-5 flex items-center gap-3 rounded-3xl p-4 animate-rise">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-clay/15 border border-clay/30">
          <ShieldCheck className="h-4.5 w-4.5 text-clay" />
        </span>
        <p className="text-dim text-xs leading-relaxed">
          Shelters and rescues can list pets after creating an account. Verified organizations get the green check after review.
          Always meet in person and never send money in advance.
        </p>
      </div>

      {/* animal rail */}
      <div className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:px-0">
        {ANIMAL_FILTERS.map((f) => (
          <Link key={f} href={f === "all" ? "/adoption" : `/adoption?animal=${f}`} className="chip shrink-0 !py-2 capitalize" data-active={animal === f}>
            {f === "all" ? "All pets" : `${f}s`}
          </Link>
        ))}
      </div>

      {matched.length === 0 ? (
        <EmptyState
          icon={HeartHandshake}
          title="No adoptable pets here yet"
          body={`Listings from shelters, rescues and rehoming families ${city ? `in ${city} ` : ""}will appear here.`}
        >
          <div className="mt-5"><CreateAdoptionTrigger city={city || ""} /></div>
        </EmptyState>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {matched.map((a) => <AdoptionCard key={a.id} a={a} isOwner={a.ownerUserId === ctx.user.id} />)}
        </div>
      )}

      {adopted.length > 0 && (
        <section className="mt-8">
          <h2 className="card-title mb-3 px-1 text-[17px] font-semibold text-white/92">Recently found homes</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            {adopted.map((a) => <AdoptionCard key={a.id} a={a} isOwner={a.ownerUserId === ctx.user.id} />)}
          </div>
        </section>
      )}
    </div>
  );
}
