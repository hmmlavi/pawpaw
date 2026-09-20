import { getSessionUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PawPrint, Sparkles, MapPin, ShieldCheck, MessagesSquare, CalendarHeart, Stethoscope, HeartHandshake, ArrowRight } from "lucide-react";
import { PetAvatar } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getSessionUser();
  if (user) redirect("/home");

  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* top nav */}
      <header className="fixed inset-x-0 top-0 z-40 px-5 pt-4">
        <div className="glass-deep mx-auto flex max-w-5xl items-center justify-between rounded-2xl px-4 py-2.5">
          <span className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sage/40 to-sky/25 border border-white/15">
              <PawPrint className="h-4 w-4 text-sage" />
            </span>
            <span className="font-display text-[17px] font-bold tracking-tight">Pawkind</span>
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost !py-2 text-sm">Sign in</Link>
            <Link href="/register" className="btn-primary !py-2 text-sm">Join free</Link>
          </nav>
        </div>
      </header>

      {/* hero */}
      <section className="relative mx-auto flex max-w-6xl flex-col items-center px-5 pt-36 pb-16 text-center sm:pt-44">
        <div className="animate-rise">
          <span className="chip !py-1.5 !px-4 text-sage border-sage/30 bg-sage/10">
            <Sparkles className="h-3.5 w-3.5" /> The pet-centered social ecosystem
          </span>
        </div>
        <h1 className="animate-rise mt-6 max-w-3xl font-display text-[42px] leading-[1.04] font-bold tracking-tight text-white sm:text-6xl md:text-7xl" style={{ animationDelay: "80ms" }}>
          Pets deserve their<br />own <span className="bg-gradient-to-r from-sage via-sky to-sand bg-clip-text text-transparent">digital world</span>
        </h1>
        <p className="animate-rise text-dim mt-6 max-w-xl text-base leading-relaxed sm:text-lg" style={{ animationDelay: "160ms" }}>
          You manage the account. Your pet becomes the identity. Social profiles, reels and stories,
          an AI care assistant, local communities, events, clinics, adoption — and a private health vault. All in one place.
        </p>
        <div className="animate-rise mt-8 flex flex-wrap items-center justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <Link href="/register" className="btn-primary !px-7 !py-3 text-[15px]">
            Create your pet's world <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/login" className="btn-ghost !px-7 !py-3 text-[15px]">I have an account</Link>
        </div>

        {/* floating spatial composition */}
        <div className="relative mt-20 w-full max-w-4xl" style={{ perspective: "1200px" }}>
          <div className="glass-deep glass-sheen animate-rise relative mx-auto max-w-lg rounded-[28px] p-6 text-left" style={{ animationDelay: "320ms", transform: "rotateX(6deg)" }}>
            <div className="flex items-center gap-4">
              <span className="story-ring"><PetAvatar name="your pet" icon="dog" size="lg" /></span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold text-white">Your pet, center stage</span>
                </div>
                <p className="text-faint text-sm">@yourfriend · their own social identity</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {["Posts", "Reels", "Stories"].map((t) => (
                <div key={t} className="glass-hair rounded-xl px-3 py-2.5 text-center text-xs font-semibold text-white/70">{t}</div>
              ))}
            </div>
            <div className="divider my-4" />
            <div className="flex items-center gap-2.5 rounded-xl bg-sage/10 border border-sage/25 px-3.5 py-3">
              <Sparkles className="h-4 w-4 shrink-0 text-sage" />
              <p className="text-[13px] leading-snug text-sage/90">Ask the AI assistant anything about health, training, nutrition or behavior.</p>
            </div>
          </div>

          {/* orbiting cards */}
          <div className="glass animate-rise absolute -left-2 top-6 hidden w-48 -rotate-6 rounded-2xl p-3.5 sm:block md:-left-10" style={{ animationDelay: "420ms" }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/85"><MapPin className="h-3.5 w-3.5 text-sky" /> Local ecosystem</div>
            <p className="text-faint mt-1.5 text-[11px] leading-snug">Events, meetups, walks, clinics and services in your city.</p>
          </div>
          <div className="glass animate-rise absolute -right-2 top-0 hidden w-44 rotate-6 rounded-2xl p-3.5 sm:block md:-right-10" style={{ animationDelay: "500ms" }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/85"><ShieldCheck className="h-3.5 w-3.5 text-sage" /> Health vault</div>
            <p className="text-faint mt-1.5 text-[11px] leading-snug">Private by default. Vaccinations, meds, weight and vet visits.</p>
          </div>
          <div className="glass animate-rise absolute -bottom-6 left-6 hidden w-44 -rotate-3 rounded-2xl p-3.5 sm:block" style={{ animationDelay: "580ms" }}>
            <div className="flex items-center gap-2 text-xs font-semibold text-white/85"><HeartHandshake className="h-3.5 w-3.5 text-clay" /> Adoption & rescue</div>
            <p className="text-faint mt-1.5 text-[11px] leading-snug">City-based discovery with verified shelters.</p>
          </div>
        </div>
      </section>

      {/* feature constellation */}
      <section className="mx-auto max-w-6xl px-5 pt-24 pb-28">
        <div className="mb-10 text-center">
          <h2 className="card-title text-3xl font-bold tracking-tight sm:text-4xl">One world, every pet need</h2>
          <p className="text-dim mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base">
            No more juggling six apps — social, care, community and discovery live here, organized around your pet.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: MessagesSquare, tint: "text-sage", bg: "from-sage/15", title: "Pet-first social", body: "Posts, reels and stories where the pet is the author. Follow friends, message pet-to-pet, build their circle." },
            { icon: Sparkles, tint: "text-sky", bg: "from-sky/15", title: "AI care assistant", body: "Guidance on health, behavior, training and nutrition — aware of your pet's profile, honest about its limits." },
            { icon: CalendarHeart, tint: "text-clay", bg: "from-clay/15", title: "Events & meetups", body: "Group walks, park meetups, birthdays and adoption events, discovered by city with one-tap directions." },
            { icon: Stethoscope, tint: "text-sage", bg: "from-sage/15", title: "Clinics & services", body: "Find verified groomers, trainers, sitters and veterinary clinics near you — no more scattered searching." },
            { icon: ShieldCheck, tint: "text-sky", bg: "from-sky/15", title: "Private health vault", body: "Vaccinations, medications, allergies and weight history, locked to your account. Your data stays yours." },
            { icon: HeartHandshake, tint: "text-clay", bg: "from-clay/15", title: "Adoption & rescue", body: "A dedicated space for shelters and rescues to help pets find homes, discovered by city and nearby." },
          ].map((f, i) => (
            <div key={f.title} className="glass glass-sheen glass-hover animate-rise rounded-3xl p-6" style={{ animationDelay: `${i * 70}ms` }}>
              <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br ${f.bg} to-transparent`}>
                <f.icon className={`h-5 w-5 ${f.tint}`} />
              </div>
              <h3 className="card-title text-lg font-semibold text-white/92">{f.title}</h3>
              <p className="text-dim mt-1.5 text-sm leading-relaxed">{f.body}</p>
            </div>
          ))}
        </div>

        <div className="glass-deep glass-sheen animate-rise mt-16 rounded-[32px] p-10 text-center sm:p-14">
          <PawPrint className="mx-auto h-8 w-8 text-sage" />
          <h2 className="card-title mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Their world starts with a profile</h2>
          <p className="text-dim mx-auto mt-2.5 max-w-md text-sm leading-relaxed">
            Create an account, pick your city, and introduce your pet. It takes about a minute.
          </p>
          <Link href="/register" className="btn-primary mt-6 inline-flex !px-8 !py-3">Get started <ArrowRight className="h-4 w-4" /></Link>
          <p className="text-faint mt-4 text-xs">Authentic by design — no fake followers, no fabricated activity. Your pet grows a real circle.</p>
        </div>
      </section>

      <footer className="border-t border-white/6 px-5 py-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p className="text-faint text-xs">Pawkind — a digital world for pets. Built with care, spatial design and real privacy.</p>
      </footer>
    </main>
  );
}
