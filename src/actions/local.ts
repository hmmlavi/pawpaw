"use server";

import { db } from "@/db";
import { events, eventAttendees, businesses, adoptions, notifications, pets } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getActiveContext, getSessionUser } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";

/* ─── Events ───────────────────────────────── */

export async function createEventAction(formData: FormData): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user) return { ok: false, error: "Not signed in." };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "meetup");
  const startsAtRaw = String(formData.get("startsAt") ?? "");
  const city = String(formData.get("city") ?? "").trim() || ctx.user.city || "";
  const venue = String(formData.get("venue") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const petTypes = String(formData.get("petTypes") ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  if (title.length < 3) return { ok: false, error: "Give your event a name." };
  const startsAt = new Date(startsAtRaw);
  if (!startsAtRaw || isNaN(startsAt.getTime())) return { ok: false, error: "Choose a date and time." };
  if (!city) return { ok: false, error: "Choose a city." };

  let imageFileId: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const saved = await saveUploadedFile(image, ctx.user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    imageFileId = saved.id;
  }

  await db.insert(events).values({
    creatorUserId: ctx.user.id,
    creatorPetId: ctx.activePet?.id ?? null,
    title,
    description,
    category,
    startsAt,
    city,
    venue,
    address,
    petTypes,
    capacity: capacityRaw ? Math.max(1, parseInt(capacityRaw, 10) || 0) : null,
    imageFileId,
  });
  revalidatePath("/events");
  revalidatePath("/explore");
  return { ok: true };
}

export async function toggleEventAttendanceAction(eventId: string, status: "going" | "interested"): Promise<{ state: "going" | "interested" | "none" }> {
  try {
    const ctx = await getActiveContext();
    if (!ctx?.user || !ctx.activePet) throw new Error();
    const [existing] = await db.select().from(eventAttendees)
      .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.petId, ctx.activePet.id))).limit(1);
    if (existing) {
      if (existing.status === status) {
        await db.delete(eventAttendees).where(eq(eventAttendees.id, existing.id));
        return { state: "none" };
      }
      await db.update(eventAttendees).set({ status }).where(eq(eventAttendees.id, existing.id));
      return { state: status };
    }
    // capacity check
    const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
    if (event?.capacity && status === "going") {
      const attendees = await db.select({ id: eventAttendees.id }).from(eventAttendees)
        .where(and(eq(eventAttendees.eventId, eventId), eq(eventAttendees.status, "going")));
      if (attendees.length >= event.capacity) return { state: "none" };
    }
    await db.insert(eventAttendees).values({ eventId, petId: ctx.activePet.id, status });
    if (event && event.creatorUserId !== ctx.user.id) {
      await db.insert(notifications).values({
        userId: event.creatorUserId,
        type: "event",
        actorPetId: ctx.activePet.id,
        recipientPetId: ctx.activePet.id,
        entityType: "event",
        entityId: eventId,
        body: `${ctx.activePet.name} is ${status === "going" ? "going to" : "interested in"} “${event.title}”.`,
      });
    }
    return { state: status };
  } catch {
    return { state: "none" };
  }
}

export async function deleteEventAction(eventId: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [event] = await db.select().from(events).where(eq(events.id, eventId)).limit(1);
  if (!event || event.creatorUserId !== user.id) return { ok: false, error: "Not your event." };
  await db.delete(events).where(eq(events.id, eventId));
  revalidatePath("/events");
  return { ok: true };
}

/* ─── Businesses ───────────────────────────── */

export async function createBusinessAction(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "other");
  const description = String(formData.get("description") ?? "").trim();
  const services = String(formData.get("services") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12);
  const hours = String(formData.get("hours") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const website = String(formData.get("website") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || user.city || "";
  const emergency = formData.get("emergency") === "on" || formData.get("emergency") === "true";

  if (name.length < 2) return { ok: false, error: "Enter the business name." };
  if (!city) return { ok: false, error: "City is required." };

  let imageFileId: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const saved = await saveUploadedFile(image, user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    imageFileId = saved.id;
  }

  await db.insert(businesses).values({
    ownerUserId: user.id, name, category, description, services, hours, phone, email, website, address, city, emergency, imageFileId,
  });
  revalidatePath("/services");
  return { ok: true };
}

export async function deleteBusinessAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [b] = await db.select().from(businesses).where(eq(businesses.id, id)).limit(1);
  if (!b || b.ownerUserId !== user.id) return { ok: false, error: "Not your business." };
  await db.delete(businesses).where(eq(businesses.id, id));
  revalidatePath("/services");
  return { ok: true };
}

/* ─── Adoption ─────────────────────────────── */

export async function createAdoptionListingAction(formData: FormData): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const name = String(formData.get("name") ?? "").trim();
  const animalType = String(formData.get("animalType") ?? "dog");
  const breed = String(formData.get("breed") ?? "").trim();
  const ageText = String(formData.get("ageText") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || user.city || "";
  const description = String(formData.get("description") ?? "").trim();
  const contact = String(formData.get("contact") ?? "").trim();

  if (name.length < 1) return { ok: false, error: "Enter the pet's name." };
  if (!contact) return { ok: false, error: "Add a way for people to contact you (email or phone)." };
  if (!city) return { ok: false, error: "City is required." };

  let imageFileId: string | null = null;
  const image = formData.get("image");
  if (image instanceof File && image.size > 0) {
    const saved = await saveUploadedFile(image, user.id);
    if ("error" in saved) return { ok: false, error: saved.error };
    imageFileId = saved.id;
  }

  await db.insert(adoptions).values({ ownerUserId: user.id, name, animalType, breed, ageText, gender, city, description, contact, imageFileId });
  revalidatePath("/adoption");
  return { ok: true };
}

export async function setAdoptionStatusAction(id: string, status: "available" | "adopted"): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [a] = await db.select().from(adoptions).where(eq(adoptions.id, id)).limit(1);
  if (!a || a.ownerUserId !== user.id) return { ok: false, error: "Not your listing." };
  await db.update(adoptions).set({ status }).where(eq(adoptions.id, id));
  revalidatePath("/adoption");
  return { ok: true };
}

export async function deleteAdoptionAction(id: string): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Not signed in." };
  const [a] = await db.select().from(adoptions).where(eq(adoptions.id, id)).limit(1);
  if (!a || a.ownerUserId !== user.id) return { ok: false, error: "Not your listing." };
  await db.delete(adoptions).where(eq(adoptions.id, id));
  revalidatePath("/adoption");
  return { ok: true };
}

/* ─── Health vault ─────────────────────────── */

export async function addHealthRecordAction(formData: FormData): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "No active pet." };
  const { healthRecords } = await import("@/db/schema");
  const kind = String(formData.get("kind") ?? "note");
  const title = String(formData.get("title") ?? "").trim();
  const details = String(formData.get("details") ?? "").trim();
  const recordDate = String(formData.get("recordDate") ?? "") || null;
  const weightRaw = String(formData.get("weightKg") ?? "").trim();
  if (title.length < 1) return { ok: false, error: "Give this record a title." };
  const weightKg = kind === "weight" && weightRaw ? parseFloat(weightRaw) : null;
  if (kind === "weight" && (weightKg === null || isNaN(weightKg) || weightKg <= 0)) {
    return { ok: false, error: "Enter a valid weight in kg." };
  }
  await db.insert(healthRecords).values({ petId: ctx.activePet.id, kind, title, details, recordDate, weightKg });
  revalidatePath("/health");
  return { ok: true };
}

export async function deleteHealthRecordAction(id: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "No active pet." };
  const { healthRecords } = await import("@/db/schema");
  const [r] = await db.select().from(healthRecords).where(eq(healthRecords.id, id)).limit(1);
  if (!r || r.petId !== ctx.activePet.id) return { ok: false, error: "Record not found." };
  await db.delete(healthRecords).where(eq(healthRecords.id, id));
  revalidatePath("/health");
  return { ok: true };
}
