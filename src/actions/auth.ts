"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { createSession, destroySession, hashPassword, verifyPassword, setActivePet, getSessionUser, getUserPets } from "@/lib/auth";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type ActionResult = { ok: boolean; error?: string };

export async function registerAction(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!name || name.length < 2) return { ok: false, error: "Please enter your name." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false, error: "Please enter a valid email address." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  if (existing[0]) return { ok: false, error: "An account with this email already exists. Try signing in." };

  const [user] = await db
    .insert(users)
    .values({ email, passwordHash: hashPassword(password), displayName: name })
    .returning();
  await createSession(user.id);
  redirect("/onboarding");
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { ok: false, error: "Enter your email and password." };
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await createSession(user.id);
  const userPets = await getUserPets(user.id);
  redirect(userPets.length > 0 ? "/home" : "/onboarding");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

export async function updateCityAction(city: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clean = city.trim();
  if (clean.length < 2) return { ok: false, error: "Enter a valid city." };
  await db.update(users).set({ city: clean }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updateDisplayNameAction(name: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const clean = name.trim();
  if (clean.length < 2) return { ok: false, error: "Name is too short." };
  await db.update(users).set({ displayName: clean }).where(eq(users.id, user.id));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function switchPetAction(petId: string) {
  const user = await getSessionUser();
  if (!user) return;
  const userPets = await getUserPets(user.id);
  if (userPets.some((p) => p.id === petId)) {
    await setActivePet(petId);
  }
  revalidatePath("/", "layout");
}

export async function searchCitySuggestions(q: string): Promise<string[]> {
  if (!q || q.length < 2) return [];
  const { pets } = await import("@/db/schema");
  const rows = await db.selectDistinct({ city: pets.city }).from(pets).where(ilike(pets.city, `%${q}%`)).limit(6);
  return rows.map((r) => r.city).filter(Boolean);
}
