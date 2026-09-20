"use server";

import { db } from "@/db";
import { pets, posts, comments, likes, saves, reposts, adoptions } from "@/db/schema";
import { eq, ilike, or, and, ne, sql } from "drizzle-orm";
import { getSessionUser, getUserPets, setActivePet } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";

import { MAX_PETS } from "@/lib/constants";


function cleanUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 30);
}

export async function checkUsernameAction(username: string): Promise<{ available: boolean; clean: string }> {
  const clean = cleanUsername(username);
  if (clean.length < 3) return { available: false, clean };
  const [hit] = await db.select({ id: pets.id }).from(pets).where(eq(pets.username, clean)).limit(1);
  return { available: !hit, clean };
}

export async function createPetAction(formData: FormData): Promise<ActionResult & { petId?: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const existing = await getUserPets(user.id);
  if (existing.length >= MAX_PETS) return { ok: false, error: `You can create up to ${MAX_PETS} pet profiles.` };

  const name = String(formData.get("name") ?? "").trim();
  const username = cleanUsername(String(formData.get("username") ?? ""));
  const animalType = String(formData.get("animalType") ?? "dog");
  const customAnimal = String(formData.get("customAnimal") ?? "").trim();
  const breed = String(formData.get("breed") ?? "").trim();
  const breedNote = String(formData.get("breedNote") ?? "");
  const gender = String(formData.get("gender") ?? "");
  const birthday = String(formData.get("birthday") ?? "");
  const bio = String(formData.get("bio") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || user.city || "";
  const isPrivate = formData.get("isPrivate") === "on" || formData.get("isPrivate") === "true";
  const personality = String(formData.get("personality") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 6);
  const interests = String(formData.get("interests") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  const favoriteFood = String(formData.get("favoriteFood") ?? "").trim();
  const favoriteToys = String(formData.get("favoriteToys") ?? "").trim();
  const favoriteActivities = String(formData.get("favoriteActivities") ?? "").trim();

  if (name.length < 1 || name.length > 40) return { ok: false, error: "Enter your pet's name." };
  if (username.length < 3) return { ok: false, error: "Username must be at least 3 characters (letters, numbers, . _ )." };
  if (!city) return { ok: false, error: "Your city is required for local discovery." };

  const [hit] = await db.select({ id: pets.id }).from(pets).where(eq(pets.username, username)).limit(1);
  if (hit) return { ok: false, error: "That @username is taken." };

  let avatarFileId: string | null = null;
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const saved = await saveUploadedFile(avatar, user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    avatarFileId = saved.id;
  }

  if (!user.city && city) {
    const { users } = await import("@/db/schema");
    await db.update(users).set({ city }).where(eq(users.id, user.id));
  }

  const [pet] = await db
    .insert(pets)
    .values({
      userId: user.id,
      name,
      username,
      animalType,
      customAnimal: animalType === "other" ? customAnimal : "",
      breed: breed || null,
      breedNote,
      gender,
      birthday: birthday || null,
      bio,
      city,
      isPrivate,
      personality,
      interests,
      favoriteFood,
      favoriteToys,
      favoriteActivities,
      avatarFileId,
      identityIcon: animalType === "other" ? "paw" : animalType,
    })
    .returning();

  if (existing.length === 0) {
    await setActivePet(pet.id);
  }
  revalidatePath("/", "layout");
  return { ok: true, petId: pet.id };
}

export async function updatePetAction(petId: string, formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!pet || pet.userId !== user.id) return { ok: false, error: "Not your pet." };

  const updates: Partial<typeof pets.$inferInsert> = {};
  const strFields = ["name", "bio", "breed", "breedNote", "gender", "city", "customAnimal", "identityIcon", "favoriteFood", "favoriteToys", "favoriteActivities", "animalType"] as const;
  for (const f of strFields) {
    const v = formData.get(f);
    if (v !== null) (updates as Record<string, unknown>)[f] = String(v).trim();
  }
  const bday = formData.get("birthday");
  if (bday !== null) updates.birthday = String(bday) || null;
  if (formData.get("isPrivate") !== null) updates.isPrivate = formData.get("isPrivate") === "true" || formData.get("isPrivate") === "on";
  for (const arr of ["personality", "interests"] as const) {
    const v = formData.get(arr);
    if (v !== null) updates[arr] = String(v).split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8);
  }
  const avatar = formData.get("avatar");
  if (avatar instanceof File && avatar.size > 0) {
    const saved = await saveUploadedFile(avatar, user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    updates.avatarFileId = saved.id;
  }
  const cover = formData.get("cover");
  if (cover instanceof File && cover.size > 0) {
    const saved = await saveUploadedFile(cover, user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    updates.coverFileId = saved.id;
  }
  if (updates.name !== undefined) {
    const n = String(updates.name);
    if (n.length < 1 || n.length > 40) return { ok: false, error: "Name must be 1-40 characters." };
  }
  await db.update(pets).set(updates).where(eq(pets.id, petId));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function deletePetAction(petId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [pet] = await db.select().from(pets).where(eq(pets.id, petId)).limit(1);
  if (!pet || pet.userId !== user.id) return { ok: false, error: "Not your pet." };
  await db.delete(pets).where(eq(pets.id, petId));
  revalidatePath("/", "layout");
  return { ok: true };
}

/* Search pets for messaging / discovery (autocomplete) */
export async function searchPetsAction(q: string): Promise<{ id: string; name: string; username: string; animalType: string; city: string; avatar: string | null }[]> {
  if (!q || q.trim().length < 1) return [];
  const rows = await db
    .select()
    .from(pets)
    .where(or(ilike(pets.name, `%${q}%`), ilike(pets.username, `%${q}%`)))
    .limit(8);
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    username: p.username,
    animalType: p.animalType,
    city: p.city,
    avatar: p.avatarFileId ? `/api/file/${p.avatarFileId}` : null,
  }));
}

/* Simple global counters that are only shown when they are real */
export async function platformStatsAction() {
  const [petCount] = await db.select({ n: sql<number>`count(*)::int` }).from(pets);
  const [postCount] = await db.select({ n: sql<number>`count(*)::int` }).from(posts);
  const [adoptCount] = await db.select({ n: sql<number>`count(*)::int` }).from(adoptions).where(eq(adoptions.status, "available"));
  return { pets: petCount?.n ?? 0, posts: postCount?.n ?? 0, adoptable: adoptCount?.n ?? 0 };
}


