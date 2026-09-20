"use server";

import { db } from "@/db";
import { posts, likes, comments, saves, reposts, pets, follows, notifications, blocks } from "@/db/schema";
import { eq, and, desc, ne, inArray, gt, isNull, or, sql } from "drizzle-orm";
import { getActiveContext } from "@/lib/auth";
import { saveUploadedFile } from "@/lib/upload";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";

async function requirePet() {
  const ctx = await getActiveContext();
  if (!ctx?.user) throw new Error("not-authed");
  if (!ctx.activePet) throw new Error("no-pet");
  return ctx;
}

async function notify(userId: string, type: string, actorPetId: string | null, body: string, opts?: { recipientPetId?: string; entityType?: string; entityId?: string }) {
  await db.insert(notifications).values({
    userId,
    type,
    actorPetId,
    body,
    recipientPetId: opts?.recipientPetId ?? null,
    entityType: opts?.entityType ?? "",
    entityId: opts?.entityId ?? "",
  });
}

/* ─── Create content ───────────────────────── */

export async function createPostAction(formData: FormData): Promise<ActionResult & { postId?: string; kind?: string }> {
  const ctx = await getActiveContext();
  if (!ctx?.user) return { ok: false, error: "Not signed in." };
  if (!ctx.activePet) return { ok: false, error: "Create a pet profile first." };

  const kind = String(formData.get("kind") ?? "post"); // post | reel | story
  const caption = String(formData.get("caption") ?? "").trim();
  const location = String(formData.get("location") ?? "").trim();
  const visibility = String(formData.get("visibility") ?? "public");
  const textStyle = String(formData.get("textStyle") ?? "");

  const mediaField = formData.getAll("media");
  const mediaFileIds: string[] = [];
  for (const m of mediaField) {
    if (m instanceof File && m.size > 0) {
      const saved = await saveUploadedFile(m, ctx.user.id);
      if ("error" in saved) return { ok: false, error: saved.error };
      mediaFileIds.push(saved.id);
    }
  }

  if (mediaFileIds.length === 0 && !caption && !textStyle) {
    return { ok: false, error: "Add a photo, video, or some text first." };
  }
  if (kind === "reel" && mediaFileIds.length === 0) {
    return { ok: false, error: "A reel needs a video." };
  }
  const maxMedia = kind === "post" ? 8 : 1;
  if (mediaFileIds.length > maxMedia) return { ok: false, error: "Too many files selected." };

  const [post] = await db
    .insert(posts)
    .values({
      petId: ctx.activePet.id,
      kind,
      caption,
      location: location || ctx.activePet.city,
      mediaFileIds,
      textStyle,
      visibility,
      expiresAt: kind === "story" ? new Date(Date.now() + 24 * 60 * 60 * 1000) : null,
    })
    .returning();

  // Mentions → notifications
  const mentionMatches = caption.match(/@[a-zA-Z0-9_.]+/g) ?? [];
  if (mentionMatches.length > 0) {
    const usernames = [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))];
    const mentioned = await db.select().from(pets).where(inArray(pets.username, usernames)).limit(10);
    for (const p of mentioned) {
      if (p.id !== ctx.activePet.id) {
        await notify(p.userId, "mention", ctx.activePet.id, `${ctx.activePet.name} mentioned ${p.name} in a ${kind}.`, {
          recipientPetId: p.id,
          entityType: "post",
          entityId: post.id,
        });
      }
    }
  }

  revalidatePath("/", "layout");
  return { ok: true, postId: post.id, kind };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "Not allowed." };
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post || post.petId !== ctx.activePet.id) return { ok: false, error: "Not your post." };
  await db.delete(posts).where(eq(posts.id, postId));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function updatePostCaptionAction(postId: string, caption: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "Not allowed." };
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post || post.petId !== ctx.activePet.id) return { ok: false, error: "Not your post." };
  await db.update(posts).set({ caption: caption.trim() }).where(eq(posts.id, postId));
  revalidatePath("/", "layout");
  return { ok: true };
}

/* ─── Engagement ───────────────────────────── */

export async function toggleLikeAction(postId: string): Promise<{ liked: boolean }> {
  const ctx = await requirePet();
  const [existing] = await db.select().from(likes).where(and(eq(likes.petId, ctx.activePet!.id), eq(likes.postId, postId))).limit(1);
  if (existing) {
    await db.delete(likes).where(eq(likes.id, existing.id));
    return { liked: false };
  }
  await db.insert(likes).values({ petId: ctx.activePet!.id, postId });
  const [post] = await db.select({ petId: posts.petId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (post) {
    const [owner] = await db.select().from(pets).where(eq(pets.id, post.petId)).limit(1);
    if (owner && owner.userId !== ctx.user!.id) {
      await notify(owner.userId, "like", ctx.activePet!.id, `${ctx.activePet!.name} liked ${owner.name}'s post.`, {
        recipientPetId: owner.id, entityType: "post", entityId: postId,
      });
    }
  }
  return { liked: true };
}

export async function addCommentAction(postId: string, text: string, parentId?: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "Not allowed." };
  const clean = text.trim();
  if (!clean || clean.length > 500) return { ok: false, error: "Comment is empty or too long." };
  await db.insert(comments).values({ postId, petId: ctx.activePet.id, text: clean, parentId: parentId || null });
  const [post] = await db.select({ petId: posts.petId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (post) {
    const [owner] = await db.select().from(pets).where(eq(pets.id, post.petId)).limit(1);
    if (owner && owner.userId !== ctx.user.id) {
      await notify(owner.userId, "comment", ctx.activePet.id, `${ctx.activePet.name} commented on ${owner.name}'s post: “${clean.slice(0, 60)}${clean.length > 60 ? "…" : ""}”`, {
        recipientPetId: owner.id, entityType: "post", entityId: postId,
      });
    }
  }
  revalidatePath("/home");
  return { ok: true };
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user || !ctx.activePet) return { ok: false, error: "Not allowed." };
  const [c] = await db.select().from(comments).where(eq(comments.id, commentId)).limit(1);
  if (!c || c.petId !== ctx.activePet.id) return { ok: false, error: "Not your comment." };
  await db.delete(comments).where(eq(comments.id, commentId));
  revalidatePath("/home");
  return { ok: true };
}

export async function toggleSaveAction(postId: string): Promise<{ saved: boolean }> {
  const ctx = await requirePet();
  const [existing] = await db.select().from(saves).where(and(eq(saves.petId, ctx.activePet!.id), eq(saves.postId, postId))).limit(1);
  if (existing) {
    await db.delete(saves).where(eq(saves.id, existing.id));
    return { saved: false };
  }
  await db.insert(saves).values({ petId: ctx.activePet!.id, postId });
  return { saved: true };
}

export async function toggleRepostAction(postId: string): Promise<{ reposted: boolean }> {
  const ctx = await requirePet();
  const [existing] = await db.select().from(reposts).where(and(eq(reposts.petId, ctx.activePet!.id), eq(reposts.postId, postId))).limit(1);
  if (existing) {
    await db.delete(reposts).where(eq(reposts.id, existing.id));
    return { reposted: false };
  }
  await db.insert(reposts).values({ petId: ctx.activePet!.id, postId });
  const [post] = await db.select({ petId: posts.petId }).from(posts).where(eq(posts.id, postId)).limit(1);
  if (post) {
    const [owner] = await db.select().from(pets).where(eq(pets.id, post.petId)).limit(1);
    if (owner && owner.userId !== ctx.user!.id) {
      await notify(owner.userId, "repost", ctx.activePet!.id, `${ctx.activePet!.name} reposted ${owner.name}'s post.`, {
        recipientPetId: owner.id, entityType: "post", entityId: postId,
      });
    }
  }
  return { reposted: true };
}

/* ─── Follow system ────────────────────────── */

export async function followAction(targetPetId: string): Promise<{ state: "following" | "requested" | "none" }> {
  const ctx = await requirePet();
  const activeId = ctx.activePet!.id;
  if (activeId === targetPetId) return { state: "none" };

  const [existing] = await db.select().from(follows).where(and(eq(follows.followerId, activeId), eq(follows.followingId, targetPetId))).limit(1);
  if (existing) {
    await db.delete(follows).where(eq(follows.id, existing.id));
    revalidatePath("/");
    return { state: "none" };
  }
  const [target] = await db.select().from(pets).where(eq(pets.id, targetPetId)).limit(1);
  if (!target) return { state: "none" };
  const status = target.isPrivate ? "requested" : "active";
  await db.insert(follows).values({ followerId: activeId, followingId: targetPetId, status });
  await notify(target.userId, status === "requested" ? "follow_request" : "follow", activeId,
    status === "requested"
      ? `${ctx.activePet!.name} requested to follow ${target.name}.`
      : `${ctx.activePet!.name} started following ${target.name}.`,
    { recipientPetId: target.id, entityType: "pet", entityId: activeId });
  revalidatePath("/");
  return { state: status === "requested" ? "requested" : "following" };
}

export async function respondFollowRequestAction(followId: string, accept: boolean): Promise<ActionResult> {
  const ctx = await requirePet();
  const [f] = await db.select().from(follows).where(eq(follows.id, followId)).limit(1);
  if (!f || f.followingId !== ctx.activePet!.id) return { ok: false, error: "Request not found." };
  if (accept) {
    await db.update(follows).set({ status: "active" }).where(eq(follows.id, followId));
    const [follower] = await db.select().from(pets).where(eq(pets.id, f.followerId)).limit(1);
    if (follower) {
      await notify(follower.userId, "follow_accept", ctx.activePet!.id, `${ctx.activePet!.name} accepted ${follower.name}'s follow request.`, { recipientPetId: follower.id });
    }
  } else {
    await db.delete(follows).where(eq(follows.id, followId));
  }
  revalidatePath("/");
  return { ok: true };
}

export async function removeFollowerAction(petId: string): Promise<ActionResult> {
  const ctx = await requirePet();
  await db.delete(follows).where(and(eq(follows.followerId, petId), eq(follows.followingId, ctx.activePet!.id)));
  revalidatePath("/");
  return { ok: true };
}

export async function toggleBlockAction(targetPetId: string): Promise<{ blocked: boolean }> {
  const ctx = await requirePet();
  const [existing] = await db.select().from(blocks).where(and(eq(blocks.blockerId, ctx.activePet!.id), eq(blocks.blockedId, targetPetId))).limit(1);
  if (existing) {
    await db.delete(blocks).where(eq(blocks.id, existing.id));
    revalidatePath("/");
    return { blocked: false };
  }
  await db.insert(blocks).values({ blockerId: ctx.activePet!.id, blockedId: targetPetId });
  await db.delete(follows).where(or(
    and(eq(follows.followerId, ctx.activePet!.id), eq(follows.followingId, targetPetId)),
    and(eq(follows.followerId, targetPetId), eq(follows.followingId, ctx.activePet!.id)),
  ));
  revalidatePath("/");
  return { blocked: true };
}

export async function reportAction(targetType: string, targetId: string, category: string, details: string): Promise<ActionResult> {
  const ctx = await getActiveContext();
  if (!ctx?.user) return { ok: false, error: "Not signed in." };
  if (!category) return { ok: false, error: "Choose a reason." };
  const { reports } = await import("@/db/schema");
  await db.insert(reports).values({
    reporterUserId: ctx.user.id,
    reporterPetId: ctx.activePet?.id ?? null,
    targetType,
    targetId,
    category,
    details: details.trim(),
  });
  return { ok: true };
}

/* ─── Story views (per pet) ────────────────── */

export async function getCommentsAction(postId: string): Promise<{
  id: string; text: string; parentId: string | null; createdAt: string;
  author: { id: string; name: string; username: string; icon: string; avatar: string | null; animalType: string; city: string; isPrivate: boolean; starBadge: boolean; birthday: string | null };
}[]> {
  const { asc } = await import("drizzle-orm");
  const rows = await db.select({ comment: comments, pet: pets }).from(comments)
    .innerJoin(pets, eq(pets.id, comments.petId))
    .where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt)).limit(100);
  return rows.map(({ comment, pet }) => ({
    id: comment.id, text: comment.text, parentId: comment.parentId,
    createdAt: comment.createdAt.toISOString(),
    author: {
      id: pet.id, name: pet.name, username: pet.username,
      icon: pet.identityIcon || "paw", avatar: pet.avatarFileId ? `/api/file/${pet.avatarFileId}` : null,
      animalType: pet.animalType, city: pet.city, isPrivate: pet.isPrivate,
      starBadge: pet.starBadge, birthday: pet.birthday,
    },
  }));
}

export async function markNotificationsReadAction(): Promise<{ done: boolean }> {
  const ctx = await getActiveContext();
  if (!ctx?.user) return { done: false };
  await db.update(notifications).set({ read: true }).where(eq(notifications.userId, ctx.user.id));
  revalidatePath("/", "layout");
  return { done: true };
}

export async function getFollowingIds(): Promise<string[]> {
  const ctx = await getActiveContext();
  if (!ctx?.activePet) return [];
  const rows = await db.select({ id: follows.followingId }).from(follows)
    .where(and(eq(follows.followerId, ctx.activePet.id), eq(follows.status, "active")));
  return rows.map((r) => r.id);
}


