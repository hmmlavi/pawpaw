import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import crypto from "node:crypto";
import { db } from "@/db";
import { sessions, users, pets } from "@/db/schema";
import { eq } from "drizzle-orm";

const SESSION_COOKIE = "pawkind_session";
const ACTIVE_PET_COOKIE = "pawkind_active_pet";
const SESSION_DAYS = 30;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

export async function createSession(userId: string) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  jar.delete(SESSION_COOKIE);
  jar.delete(ACTIVE_PET_COOKIE);
}

export const getSessionUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const matched = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.token, token))
    .limit(1);
  const row = matched[0];
  if (!row || row.expiresAt < new Date()) return null;
  return row.user;
});

export const getUserPets = cache(async (userId: string) => {
  return db.select().from(pets).where(eq(pets.userId, userId)).orderBy(pets.createdAt);
});

export const getActiveContext = cache(async () => {
  const user = await getSessionUser();
  if (!user) return null;
  const userPets = await getUserPets(user.id);
  const jar = await cookies();
  const activeId = jar.get(ACTIVE_PET_COOKIE)?.value;
  const activePet = userPets.find((p) => p.id === activeId) ?? userPets[0] ?? null;
  return { user, pets: userPets, activePet };
});

export async function setActivePet(petId: string) {
  const jar = await cookies();
  jar.set(ACTIVE_PET_COOKIE, petId, { httpOnly: true, sameSite: "lax", path: "/" });
}
