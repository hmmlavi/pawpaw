"use server";

import { db } from "@/db";
import { conversations, conversationMembers, messages, pets, follows, notifications } from "@/db/schema";
import { eq, and, inArray, desc } from "drizzle-orm";
import { getActiveContext } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";

async function requireCtx() {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) throw new Error("unauthorized");
  return { user: ctx.user, pet: ctx.activePet };
}

/** Open (or create) a 1:1 conversation with another pet as the active pet. */
export async function openConversationAction(otherPetId: string): Promise<{ conversationId?: string; error?: string }> {
  try {
    const { user, pet } = await requireCtx();
    if (otherPetId === pet.id) return { error: "You can't message yourself." };
    const [other] = await db.select().from(pets).where(eq(pets.id, otherPetId)).limit(1);
    if (!other) return { error: "Pet not found." };

    // find existing 1:1 conversation between the two pets
    const mine = await db.select({ conversationId: conversationMembers.conversationId }).from(conversationMembers).where(eq(conversationMembers.petId, pet.id));
    if (mine.length > 0) {
      const convIds = mine.map((m) => m.conversationId);
      const shared = await db
        .select({ conversationId: conversationMembers.conversationId, isGroup: conversations.isGroup })
        .from(conversationMembers)
        .innerJoin(conversations, eq(conversations.id, conversationMembers.conversationId))
        .where(and(inArray(conversationMembers.conversationId, convIds), eq(conversationMembers.petId, otherPetId), eq(conversations.isGroup, false)))
        .limit(1);
      if (shared[0]) return { conversationId: shared[0].conversationId };
    }

    // request semantics: pending until the other pet's owner follows the sender back or accepts
    const [theyFollowMe] = await db.select().from(follows)
      .where(and(eq(follows.followerId, otherPetId), eq(follows.followingId, pet.id), eq(follows.status, "active"))).limit(1);

    const [conv] = await db.insert(conversations).values({ isGroup: false }).returning();
    await db.insert(conversationMembers).values([
      { conversationId: conv.id, petId: pet.id, status: "active" },
      { conversationId: conv.id, petId: otherPetId, status: theyFollowMe ? "active" : "pending" },
    ]);
    await db.insert(notifications).values({
      userId: other.userId,
      type: theyFollowMe ? "message" : "message_request",
      actorPetId: pet.id,
      recipientPetId: otherPetId,
      entityType: "conversation",
      entityId: conv.id,
      body: theyFollowMe ? `${pet.name} started a conversation.` : `${pet.name} wants to send a message.`,
    });
    revalidatePath("/messages");
    return { conversationId: conv.id };
  } catch {
    return { error: "Could not start conversation." };
  }
}

export async function createGroupAction(title: string, petIds: string[]): Promise<ActionResult> {
  try {
    const { pet } = await requireCtx();
    const ids = [...new Set(petIds)].filter((id) => id !== pet.id).slice(0, 30);
    if (ids.length < 2) return { ok: false, error: "A group needs at least 2 other pets." };
    const cleanTitle = title.trim() || "Group chat";
    const [conv] = await db.insert(conversations).values({ isGroup: true, title: cleanTitle }).returning();
    await db.insert(conversationMembers).values([
      { conversationId: conv.id, petId: pet.id, status: "active" },
      ...ids.map((id) => ({ conversationId: conv.id, petId: id, status: "active" })),
    ]);
    const others = await db.select().from(pets).where(inArray(pets.id, ids));
    for (const p of others) {
      await db.insert(notifications).values({
        userId: p.userId, type: "message", actorPetId: pet.id, recipientPetId: p.id,
        entityType: "conversation", entityId: conv.id,
        body: `${pet.name} added ${p.name} to “${cleanTitle}”.`,
      });
    }
    revalidatePath("/messages");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not create group." };
  }
}

export async function acceptMessageRequestAction(conversationId: string): Promise<ActionResult> {
  try {
    const { pet } = await requireCtx();
    await db.update(conversationMembers).set({ status: "active" })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, pet.id)));
    revalidatePath("/messages");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not accept request." };
  }
}

export async function declineMessageRequestAction(conversationId: string): Promise<ActionResult> {
  try {
    const { pet } = await requireCtx();
    const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
    if (conv) {
      await db.delete(conversations).where(eq(conversations.id, conversationId));
    }
    revalidatePath("/messages");
    return { ok: true };
  } catch {
    return { ok: false, error: "Could not decline." };
  }
}

export async function sendMessageAction(formData: FormData): Promise<ActionResult & { messageId?: string }> {
  try {
    const { user, pet } = await requireCtx();
    const conversationId = String(formData.get("conversationId") ?? "");
    const text = String(formData.get("text") ?? "").trim();
    const postShareId = String(formData.get("postShareId") ?? "") || null;

    const [member] = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, pet.id))).limit(1);
    if (!member) return { ok: false, error: "You're not part of this conversation." };

    let kind = "text";
    let fileId: string | null = null;
    const media = formData.get("media");
    if (media instanceof File && media.size > 0) {
      const saved = await saveUploadedFile(media, user.id);
      if ("error" in saved) return { ok: false, error: saved.error };
      fileId = saved.id;
      kind = media.type.startsWith("video/") ? "video" : "image";
    } else if (postShareId) {
      kind = "post";
    }
    if (!text && !fileId && !postShareId) return { ok: false, error: "Message is empty." };
    if (text.length > 2000) return { ok: false, error: "Message too long." };

    const [msg] = await db.insert(messages).values({
      conversationId, senderPetId: pet.id, kind, text, fileId, postShareId,
    }).returning();

    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, pet.id)));

    // notify other members
    const others = await db.select({ petId: conversationMembers.petId }).from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId)));
    const otherPetIds = others.map((o) => o.petId).filter((id) => id !== pet.id);
    if (otherPetIds.length > 0) {
      const otherPets = await db.select().from(pets).where(inArray(pets.id, otherPetIds));
      for (const p of otherPets) {
        await db.insert(notifications).values({
          userId: p.userId, type: "message", actorPetId: pet.id, recipientPetId: p.id,
          entityType: "conversation", entityId: conversationId,
          body: text ? `${pet.name}: ${text.slice(0, 70)}` : `${pet.name} sent ${kind === "post" ? "a post" : `an ${kind}`}.`,
        });
      }
    }
    revalidatePath("/messages");
    return { ok: true, messageId: msg.id };
  } catch {
    return { ok: false, error: "Message could not be sent." };
  }
}

export async function markConversationReadAction(conversationId: string): Promise<{ done: boolean }> {
  try {
    const { pet } = await requireCtx();
    await db.update(conversationMembers).set({ lastReadAt: new Date() })
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, pet.id)));
    revalidatePath("/messages");
    return { done: true };
  } catch {
    return { done: false };
  }
}

export async function getConversationUpdatesAction(conversationId: string, afterIso: string): Promise<unknown[]> {
  try {
    const { pet } = await requireCtx();
    const [member] = await db.select().from(conversationMembers)
      .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, pet.id))).limit(1);
    if (!member) return [];
    const rows = await db.select().from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(desc(messages.createdAt))
      .limit(60);
    const after = new Date(afterIso);
    return rows.filter((m) => m.createdAt > after);
  } catch {
    return [];
  }
}
