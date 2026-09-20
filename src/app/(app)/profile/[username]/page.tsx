import { getActiveContext } from "@/lib/auth";
import { loadProfile, toPetLite } from "@/lib/queries";
import { notFound, redirect } from "next/navigation";
import { PetAvatar } from "@/components/ui";
import { IdentityBadge, StarBadge, BirthdayBadge, AnimalIcon } from "@/components/pet-identity";
import { ProfileActions, RequestsPanel, FollowListTrigger, BannerEditFab, type EditablePet } from "@/components/profile";
import { ProfileTabs, PrivateProfileGate } from "@/components/profile-tabs";
import { isBirthdayToday, petAge, animalLabel, cn } from "@/lib/utils";
import { MapPin, Cake, Dna, Heart, Bone, Gamepad2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const ctx = await getActiveContext();
  if (!ctx?.activePet) redirect("/onboarding");

  const profile = await loadProfile(username, ctx.activePet.id);
  if (!profile) notFound();

  const { pet } = profile;
  const bday = isBirthdayToday(pet.birthday);
  const age = petAge(pet.birthday);
  const editable: EditablePet = {
    ...pet,
    bio: profile.bio,
    breed: profile.breed,
    breedNote: profile.breedNote,
    gender: profile.gender,
    personality: profile.personality,
    interests: profile.interests,
    favoriteFood: profile.favoriteFood,
    favoriteToys: profile.favoriteToys,
    favoriteActivities: profile.favoriteActivities,
    birthday: pet.birthday,
    customAnimal: profile.customAnimal,
    city: pet.city,
    cover: profile.cover,
  };

  return (
    <div>
      {/* ── Identity space ─────────────────────── */}
      <section className="glass-deep glass-sheen animate-rise relative overflow-hidden rounded-[30px]">
        {/* cover */}
        <div className="relative h-44 sm:h-60">
          {profile.cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.cover} alt={`${pet.name}'s banner`} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-sage/22 via-ink-3 to-sky/18" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#10121680] to-transparent" />
          {bday && (
            <div className="on-dark absolute inset-x-4 top-4 flex items-center gap-2.5 rounded-2xl border border-clay/30 bg-black/45 px-4 py-2.5 backdrop-blur-md animate-rise">
              <Cake className="h-4 w-4 shrink-0 text-clay" />
              <p className="text-xs font-semibold text-white/90">It&apos;s {pet.name}&apos;s birthday — say something nice!</p>
            </div>
          )}
          {profile.viewerOwns && <BannerEditFab pet={editable} />}
        </div>

        <div className="relative px-5 pb-5 sm:px-6">
          <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 sm:-mt-14">
            <div className="flex items-end gap-4">
              <span className={cn("rounded-full", bday ? "story-ring-bday" : "ring-4 ring-ink-2/90")}>
                <PetAvatar avatarFileId={pet.avatar ? pet.avatar.replace("/api/file/", "") : null} name={pet.name} icon={pet.icon} size="xl" />
              </span>
              <div className="pb-1.5">
                <h1 className="card-title flex items-center gap-2 text-2xl font-bold tracking-tight text-white/95">
                  {pet.name}
                  <IdentityBadge icon={pet.icon} />
                  {pet.starBadge && <StarBadge />}
                  {bday && <BirthdayBadge />}
                </h1>
                <p className="text-dim text-sm">@{pet.username}</p>
              </div>
            </div>
            <div className="pb-1">
              <ProfileActions pet={pet} followState={profile.followState} isBlocked={profile.isBlocked} viewerOwns={profile.viewerOwns} />
            </div>
          </div>

          {profile.bio && <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/85">{profile.bio}</p>}

          {/* identity chips */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            <span className="chip !cursor-default"><AnimalIcon icon={pet.icon} className="h-3.5 w-3.5 text-sage" /> {animalLabel(pet.animalType, profile.customAnimal)}</span>
            {profile.breed && <span className="chip !cursor-default"><Dna className="h-3.5 w-3.5 text-sky" /> {profile.breed}{profile.breedNote === "mixed" ? " (mixed)" : ""}</span>}
            {profile.breedNote === "unknown" && !profile.breed && <span className="chip !cursor-default"><Dna className="h-3.5 w-3.5 text-sky" /> Breed unknown — one of a kind</span>}
            {age && <span className="chip !cursor-default"><Cake className="h-3.5 w-3.5 text-sand" /> {age} old</span>}
            {profile.gender && <span className="chip !cursor-default capitalize">{profile.gender}</span>}
            {pet.city && <span className="chip !cursor-default"><MapPin className="h-3.5 w-3.5 text-clay" /> {pet.city}</span>}
          </div>

          {/* stats */}
          <div className="mt-5 flex items-center gap-6 border-t border-white/7 pt-4">
            <div className="text-center">
              <div className="font-display text-lg font-bold text-white/95 tabular-nums">{profile.counts.posts + profile.counts.reels}</div>
              <div className="text-faint text-[10px] font-semibold uppercase tracking-wider">Posts</div>
            </div>
            <FollowListTrigger label="Followers" count={profile.counts.followers} list={profile.followers} viewerOwns={profile.viewerOwns} meId={ctx.activePet.id} />
            <FollowListTrigger label="Following" count={profile.counts.following} list={profile.following} viewerOwns={profile.viewerOwns} meId={ctx.activePet.id} />
          </div>
        </div>
      </section>

      {/* requests */}
      {profile.viewerOwns && <div className="mt-5"><RequestsPanel requests={profile.requests} /></div>}

      {/* persona */}
      {(profile.personality.length > 0 || profile.interests.length > 0 || profile.favoriteFood || profile.favoriteToys || profile.favoriteActivities) && (
        <section className="glass glass-sheen mt-5 animate-rise rounded-3xl p-5" style={{ animationDelay: "60ms" }}>
          <p className="text-faint text-[10px] font-bold uppercase tracking-[0.16em]">Who {pet.name} is</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {profile.personality.map((p) => <span key={p} className="chip !cursor-default !border-sage/30 !bg-sage/10 !text-sage">{p}</span>)}
            {profile.interests.map((i) => <span key={i} className="chip !cursor-default !border-sky/30 !bg-sky/10 !text-sky/90">{i}</span>)}
          </div>
          {(profile.favoriteFood || profile.favoriteToys || profile.favoriteActivities) && (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {profile.favoriteFood && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-white/4 px-3.5 py-3">
                  <Bone className="h-4 w-4 shrink-0 text-sand" />
                  <div className="min-w-0"><p className="text-faint text-[10px] font-semibold uppercase">Food</p><p className="truncate text-xs font-bold text-white/85">{profile.favoriteFood}</p></div>
                </div>
              )}
              {profile.favoriteToys && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-white/4 px-3.5 py-3">
                  <Gamepad2 className="h-4 w-4 shrink-0 text-sky" />
                  <div className="min-w-0"><p className="text-faint text-[10px] font-semibold uppercase">Toys</p><p className="truncate text-xs font-bold text-white/85">{profile.favoriteToys}</p></div>
                </div>
              )}
              {profile.favoriteActivities && (
                <div className="flex items-center gap-2.5 rounded-2xl bg-white/4 px-3.5 py-3">
                  <Heart className="h-4 w-4 shrink-0 text-clay" />
                  <div className="min-w-0"><p className="text-faint text-[10px] font-semibold uppercase">Loves</p><p className="truncate text-xs font-bold text-white/85">{profile.favoriteActivities}</p></div>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* content */}
      <div className="mt-5">
        {profile.isBlocked ? (
          <div className="glass animate-rise rounded-3xl p-10 text-center">
            <p className="text-sm font-bold text-white/85">You've blocked @{pet.username}</p>
            <p className="text-faint mt-1 text-xs">Unblock to see their content again.</p>
          </div>
        ) : profile.canView ? (
          <ProfileTabs
            posts={profile.posts} reels={profile.reels} tagged={profile.tagged} saved={profile.saved}
            me={toPetLite(ctx.activePet)} meOwner={ctx.user.displayName} viewerOwns={profile.viewerOwns} name={pet.name}
          />
        ) : (
          <PrivateProfileGate />
        )}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `@${username}` };
}
