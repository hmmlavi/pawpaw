"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PawPrint, MapPin, ArrowRight, ArrowLeft, Loader2, Check, Camera, Calendar, Lock, Globe, Sparkles, CircleCheck } from "lucide-react";
import { ANIMAL_TYPES, cn } from "@/lib/utils";
import { AnimalIcon } from "@/components/pet-identity";
import { checkUsernameAction, createPetAction } from "@/actions/pets";
import { toast } from "sonner";

const PERSONALITY = ["Playful", "Calm", "Curious", "Goofy", "Shy", "Brave", "Cuddly", "Independent", "Energetic", "Gentle", "Mischievous", "Loyal"];
const INTERESTS = ["Walks", "Fetch", "Swimming", "Naps", "Treats", "Car rides", "Hiking", "Beach", "Toys", "Socializing", "Training", "Chasing", "Cuddles", "Snow"];

type Step = 0 | 1 | 2 | 3;

export function OnboardingWizard({ defaultCity, hasPets }: { defaultCity: string; hasPets: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(hasPets ? 1 : 0);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  const [city, setCity] = useState(defaultCity);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameState, setUsernameState] = useState<"idle" | "checking" | "ok" | "taken">("idle");
  const [animalType, setAnimalType] = useState("dog");
  const [customAnimal, setCustomAnimal] = useState("");
  const [breed, setBreed] = useState("");
  const [breedNote, setBreedNote] = useState("");
  const [gender, setGender] = useState("");
  const [birthday, setBirthday] = useState("");
  const [bio, setBio] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [personality, setPersonality] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [favoriteFood, setFavoriteFood] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onUsername = (v: string) => {
    setUsername(v);
    setUsernameState("checking");
    if (checkTimer.current) clearTimeout(checkTimer.current);
    if (v.trim().length < 3) { setUsernameState("idle"); return; }
    checkTimer.current = setTimeout(async () => {
      const res = await checkUsernameAction(v);
      setUsername(res.clean);
      setUsernameState(res.available ? "ok" : "taken");
    }, 350);
  };

  const stepValid = useMemo(() => {
    if (step === 0) return city.trim().length >= 2;
    if (step === 1) return name.trim().length >= 1 && username.trim().length >= 3 && usernameState !== "taken";
    return true;
  }, [step, city, name, username, usernameState]);

  const toggle = (list: string[], set: (v: string[]) => void, v: string, max: number) => {
    set(list.includes(v) ? list.filter((x) => x !== v) : list.length < max ? [...list, v] : list);
  };

  const submit = () => {
    setError(null);
    const fd = new FormData();
    fd.set("name", name.trim());
    fd.set("username", username.trim());
    fd.set("animalType", animalType);
    fd.set("customAnimal", customAnimal.trim());
    fd.set("breed", breed.trim());
    fd.set("breedNote", breedNote);
    fd.set("gender", gender);
    fd.set("birthday", birthday);
    fd.set("bio", bio.trim());
    fd.set("city", city.trim());
    fd.set("isPrivate", String(isPrivate));
    fd.set("personality", personality.join(","));
    fd.set("interests", interests.join(","));
    fd.set("favoriteFood", favoriteFood.trim());
    const file = fileRef.current?.files?.[0];
    if (file) fd.set("avatar", file);
    start(async () => {
      const res = await createPetAction(fd);
      if (res.ok) {
        toast.success(`Welcome to Pawkind, ${name || "friend"}!`);
        router.push("/home");
        router.refresh();
      } else {
        setError(res.error ?? "Could not create your pet.");
        toast.error(res.error ?? "Could not create your pet");
      }
    });
  };

  const steps = ["Your city", "Pet identity", "Details", "Privacy & finish"];

  return (
    <main className="relative mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-5 py-10">
      <div className="mb-6 flex items-center gap-2.5 animate-rise">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sage/40 to-sky/25 border border-white/15">
          <PawPrint className="h-4.5 w-4.5 text-sage" />
        </span>
        <span className="font-display text-xl font-bold tracking-tight">Pawkind</span>
      </div>

      {/* progress */}
      <div className="mb-5 flex items-center gap-1.5">
        {steps.map((s, i) => (
          <div key={s} className={cn("h-1 w-12 rounded-full transition-all duration-500", i <= step ? "bg-sage" : "bg-white/10", i === step && "animate-pulse-ring")} />
        ))}
      </div>
      <p className="text-faint mb-3 text-[11px] font-semibold tracking-widest uppercase">{steps[step]}</p>

      <div className="glass-deep glass-sheen w-full rounded-[28px] p-6 sm:p-8" key={step}>
        {step === 0 && (
          <div className="animate-rise-fast">
            <h1 className="card-title text-2xl font-bold tracking-tight">First, where do you two live?</h1>
            <p className="text-dim mt-2 text-sm leading-relaxed">
              Your city powers local discovery — events next door, clinics nearby, pets in your neighborhood.
              We only ever use city-level info. Never your exact address.
            </p>
            <div className="relative mt-6">
              <MapPin className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
              <input autoFocus value={city} onChange={(e) => setCity(e.target.value)} className="field !pl-10 !py-3.5 text-base" placeholder="e.g. Amsterdam, Austin, Lisbon…" maxLength={60} />
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="animate-rise-fast">
            <h1 className="card-title text-2xl font-bold tracking-tight">Introduce your pet</h1>
            <p className="text-dim mt-2 text-sm">This becomes their public social identity. They're the star.</p>

            <div className="mt-6 flex items-center gap-4">
              <button type="button" onClick={() => fileRef.current?.click()} className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-white/20 bg-white/4 transition-colors hover:border-sage/50">
                {avatarPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarPreview} alt="Pet" className="h-full w-full object-cover" />
                ) : (
                  <Camera className="text-faint group-hover:text-sage h-6 w-6 transition-colors" />
                )}
                <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[9px] font-semibold text-white/80 opacity-0 transition-opacity group-hover:opacity-100">Photo</span>
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setAvatarPreview(URL.createObjectURL(f));
              }} />
              <div className="flex-1 space-y-3">
                <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Pet's name" maxLength={40} />
                <div className="relative">
                  <span className="text-faint pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm">@</span>
                  <input value={username} onChange={(e) => onUsername(e.target.value)} className="field !pl-8 !pr-9" placeholder="username" maxLength={30} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameState === "checking" && <Loader2 className="text-faint h-3.5 w-3.5 animate-spin" />}
                    {usernameState === "ok" && <Check className="h-3.5 w-3.5 text-sage" />}
                  </span>
                </div>
              </div>
            </div>
            {usernameState === "taken" && <p className="text-clay mt-2 text-xs">@{username} is taken — try another.</p>}

            <label className="label mt-6">What kind of animal?</label>
            <div className="grid grid-cols-5 gap-2">
              {ANIMAL_TYPES.map((a) => (
                <button key={a.value} type="button" onClick={() => setAnimalType(a.value)}
                  className={cn("flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 transition-all duration-300",
                    animalType === a.value ? "border-sage/50 bg-sage/12 text-sage shadow-[0_8px_24px_-8px_rgba(143,185,154,0.4)]" : "border-white/8 bg-white/3 text-white/55 hover:border-white/20 hover:text-white/85")}>
                  <AnimalIcon icon={a.icon} className="h-5 w-5" />
                  <span className="text-[10px] font-semibold leading-none">{a.label}</span>
                </button>
              ))}
            </div>
            {animalType === "other" && (
              <input value={customAnimal} onChange={(e) => setCustomAnimal(e.target.value)} className="field mt-3 animate-fade" placeholder="What animal is it? (e.g. hedgehog, parrot…)" maxLength={30} />
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr,auto]">
              <input value={breed} onChange={(e) => setBreed(e.target.value)} className="field" placeholder={breedNote === "unknown" ? "Breed unknown — that's fine" : "Breed (optional)"} maxLength={50} />
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setBreedNote(breedNote === "mixed" ? "" : "mixed")} className="chip" data-active={breedNote === "mixed"}>Mixed</button>
                <button type="button" onClick={() => setBreedNote(breedNote === "unknown" ? "" : "unknown")} className="chip" data-active={breedNote === "unknown"}>Unknown</button>
              </div>
            </div>
            <p className="text-faint mt-2 flex items-center gap-1.5 text-[11px]">
              <Sparkles className="h-3 w-3" /> Not sure about breed? Leave it — you can upload a photo in the AI assistant later for a careful, non-diagnostic guess.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="animate-rise-fast">
            <h1 className="card-title text-2xl font-bold tracking-tight">A little more about {name || "them"}</h1>
            <p className="text-dim mt-2 text-sm">Personality shines here. Everything is editable later.</p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Birthday</label>
                <div className="relative">
                  <Calendar className="text-faint pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" />
                  <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} max={new Date().toISOString().slice(0, 10)} className="field !pl-10" />
                </div>
              </div>
              <div>
                <label className="label">Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} className="field">
                  <option value="">Prefer not to say</option>
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                </select>
              </div>
            </div>

            <label className="label mt-5">Personality (up to 6)</label>
            <div className="flex flex-wrap gap-1.5">
              {PERSONALITY.map((p) => (
                <button key={p} type="button" onClick={() => toggle(personality, setPersonality, p, 6)} className="chip" data-active={personality.includes(p)}>{p}</button>
              ))}
            </div>

            <label className="label mt-5">Interests (up to 8)</label>
            <div className="flex flex-wrap gap-1.5">
              {INTERESTS.map((p) => (
                <button key={p} type="button" onClick={() => toggle(interests, setInterests, p, 8)} className="chip" data-active={interests.includes(p)}>{p}</button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <input value={favoriteFood} onChange={(e) => setFavoriteFood(e.target.value)} className="field" placeholder="Favorite food (optional)" maxLength={60} />
              <input value={bio} onChange={(e) => setBio(e.target.value)} className="field" placeholder={`One line about ${name || "your pet"} (optional)`} maxLength={140} />
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-rise-fast">
            <h1 className="card-title text-2xl font-bold tracking-tight">Privacy — you're in control</h1>
            <p className="text-dim mt-2 text-sm">Choose who can see {name || "your pet"}'s world. Change it anytime.</p>

            <div className="mt-6 space-y-3">
              <button type="button" onClick={() => setIsPrivate(false)}
                className={cn("flex w-full items-start gap-3.5 rounded-2xl border p-4.5 text-left transition-all", !isPrivate ? "border-sage/50 bg-sage/10" : "border-white/8 bg-white/3 hover:border-white/20")}>
                <Globe className={cn("mt-0.5 h-5 w-5 shrink-0", !isPrivate ? "text-sage" : "text-faint")} />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-white/90">Public profile {!isPrivate && <CircleCheck className="h-4 w-4 text-sage" />}</span>
                  <span className="text-dim mt-1 block text-[13px] leading-relaxed">Anyone can view the profile and posts, and follow instantly.</span>
                </span>
              </button>
              <button type="button" onClick={() => setIsPrivate(true)}
                className={cn("flex w-full items-start gap-3.5 rounded-2xl border p-4.5 text-left transition-all", isPrivate ? "border-sage/50 bg-sage/10" : "border-white/8 bg-white/3 hover:border-white/20")}>
                <Lock className={cn("mt-0.5 h-5 w-5 shrink-0", isPrivate ? "text-sage" : "text-faint")} />
                <span>
                  <span className="flex items-center gap-2 text-sm font-bold text-white/90">Private profile {isPrivate && <CircleCheck className="h-4 w-4 text-sage" />}</span>
                  <span className="text-dim mt-1 block text-[13px] leading-relaxed">Follow requests require your approval. Only approved followers see posts.</span>
                </span>
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-white/8 bg-white/3 px-4 py-3.5">
              <p className="text-faint text-xs leading-relaxed">
                City shown: <span className="font-semibold text-white/70">{city || "—"}</span>. Exact addresses are never requested or shown.
                Health records live in the private vault, visible only to you.
              </p>
            </div>
            {error && <p className="mt-4 rounded-xl border border-clay/40 bg-clay/10 px-3.5 py-2.5 text-[13px] text-clay animate-fade">{error}</p>}
          </div>
        )}

        {/* nav */}
        <div className="mt-8 flex items-center justify-between">
          {step > (hasPets ? 1 : 0) ? (
            <button type="button" onClick={() => setStep(((step - 1) as Step))} className="btn-ghost !py-2.5 text-sm">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          ) : <span />}
          {step < 3 ? (
            <button type="button" disabled={!stepValid} onClick={() => setStep(((step + 1) as Step))} className="btn-primary !py-2.5 text-sm">
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" disabled={pending || !city.trim() || !name.trim() || usernameState === "taken"} onClick={submit} className="btn-primary !py-2.5 text-sm">
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Enter Pawkind <Sparkles className="h-4 w-4" /></>}
            </button>
          )}
        </div>
      </div>

      {(step === 1 || step === 2) && (
        <button type="button" onClick={() => setStep(3)} className="text-faint hover:text-white/60 mt-4 text-xs font-medium transition-colors">
          Skip details for now
        </button>
      )}
    </main>
  );
}
