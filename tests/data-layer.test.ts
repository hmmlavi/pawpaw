// @vitest-environment node
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// Controllable auth context (avoids React `cache()` stickiness across test users).
const authState = vi.hoisted(() => ({ ctx: null as unknown as null | Record<string, unknown> }));
vi.mock("@/lib/auth", () => ({
  getActiveContext: vi.fn(async () => authState.ctx),
  getSessionUser: vi.fn(async () => (authState.ctx as { user?: unknown } | null)?.user ?? null),
  getUserPets: vi.fn(async () => (authState.ctx as { pets?: unknown[] } | null)?.pets ?? []),
  setActivePet: vi.fn(async () => {}),
}));

// Real Postgres (PGlite) behind the app's @/db module.
vi.mock("@/db", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const client = new PGlite();
  await client.waitReady;
  const db = drizzle(client);
  return { db, pool: {}, __client: client };
});

import { db as testDb } from "@/db";
import * as dbModule from "@/db";

const __client = (
  dbModule as unknown as {
    __client: { exec: (s: string) => Promise<unknown>; query: (s: string) => Promise<unknown> };
  }
).__client;
import { loadMigrationStatements } from "./support/migrate";
import { users, pets, posts, comments } from "@/db/schema";
import { eq } from "drizzle-orm";

function setCtx(user: Record<string, unknown>, userPets: Record<string, unknown>[], activePet: Record<string, unknown>) {
  authState.ctx = { user, pets: userPets, activePet };
}

let rahul: Record<string, string>;
let priya: Record<string, string>;
let bruno: Record<string, string>; // Rahul's pet
let mittens: Record<string, string>; // Priya's pet
let postId: string;

const pngBytes = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);
const pngFile = (name: string) => new File([pngBytes], name, { type: "image/png" });

beforeAll(async () => {
  try {
    await (__client as { exec: (s: string) => Promise<unknown> }).exec("CREATE EXTENSION IF NOT EXISTS pgcrypto;");
  } catch {
    /* pgcrypto unavailable — fall back to random uuid expression */
  }
  for (const stmt of loadMigrationStatements()) {
    await (__client as { query: (s: string) => Promise<unknown> }).query(stmt);
  }

  const [u1] = await (testDb as typeof import("@/db").db)
    .insert(users)
    .values({ email: "rahul@example.com", passwordHash: "x", displayName: "Rahul" })
    .returning();
  const [u2] = await (testDb as typeof import("@/db").db)
    .insert(users)
    .values({ email: "priya@example.com", passwordHash: "x", displayName: "Priya" })
    .returning();
  rahul = u1 as unknown as Record<string, string>;
  priya = u2 as unknown as Record<string, string>;

  const [p1] = await (testDb as typeof import("@/db").db)
    .insert(pets)
    .values({ userId: rahul.id, name: "Bruno", username: "bruno", animalType: "dog", city: "Lisbon" })
    .returning();
  const [p2] = await (testDb as typeof import("@/db").db)
    .insert(pets)
    .values({ userId: priya.id, name: "Mittens", username: "mittens", animalType: "cat", city: "Lisbon" })
    .returning();
  bruno = p1 as unknown as Record<string, string>;
  mittens = p2 as unknown as Record<string, string>;

  const [post] = await (testDb as typeof import("@/db").db)
    .insert(posts)
    .values({ petId: bruno.id, kind: "post", caption: "Sunny day!", mediaFileIds: [] })
    .returning();
  postId = (post as { id: string }).id;
}, 120000);

describe("comments: owner identity + likes", () => {
  it("shows the personal account name, not the pet name", async () => {
    const { addCommentAction, getCommentsAction } = await import("@/actions/content");
    setCtx(priya, [mittens], mittens);
    const res = await addCommentAction(postId, "This is adorable!");
    expect(res.ok).toBe(true);

    const rows = await getCommentsAction(postId);
    expect(rows).toHaveLength(1);
    // Visible identity is the person…
    expect(rows[0].ownerName).toBe("Priya");
    // …while the pet stays associated internally.
    expect(rows[0].author.name).toBe("Mittens");
    expect(rows[0].author.username).toBe("mittens");
    expect(rows[0].likeCount).toBe(0);
    expect(rows[0].viewerLiked).toBe(false);
  });

  it("supports like/unlike with counts and viewer state", async () => {
    const { getCommentsAction, toggleCommentLikeAction } = await import("@/actions/content");
    const commentId = (await getCommentsAction(postId))[0].id;

    // Rahul (post owner) likes Priya's comment.
    setCtx(rahul, [bruno], bruno);
    let r = await toggleCommentLikeAction(commentId);
    expect(r).toEqual({ liked: true, likeCount: 1 });

    let rows = await getCommentsAction(postId);
    expect(rows[0].likeCount).toBe(1);
    expect(rows[0].viewerLiked).toBe(true);

    // Priya sees the count but not her own like.
    setCtx(priya, [mittens], mittens);
    rows = await getCommentsAction(postId);
    expect(rows[0].likeCount).toBe(1);
    expect(rows[0].viewerLiked).toBe(false);

    // Unlike back.
    setCtx(rahul, [bruno], bruno);
    r = await toggleCommentLikeAction(commentId);
    expect(r).toEqual({ liked: false, likeCount: 0 });
  });

  it("keeps replies threaded and enforces delete ownership", async () => {
    const { addCommentAction, getCommentsAction, deleteCommentAction } = await import("@/actions/content");
    setCtx(rahul, [bruno], bruno);
    const parentId = (await getCommentsAction(postId))[0].id;
    const res = await addCommentAction(postId, "Thank you!", parentId);
    expect(res.ok).toBe(true);

    const rows = await getCommentsAction(postId);
    const reply = rows.find((c) => c.parentId === parentId);
    expect(reply?.ownerName).toBe("Rahul");
    expect(reply?.text).toBe("Thank you!");

    // Non-owner cannot delete.
    setCtx(priya, [mittens], mittens);
    const denied = await deleteCommentAction(reply!.id);
    expect(denied.ok).toBe(false);

    // Owner can.
    setCtx(rahul, [bruno], bruno);
    const allowed = await deleteCommentAction(reply!.id);
    expect(allowed.ok).toBe(true);
    expect((await getCommentsAction(postId)).some((c) => c.id === reply!.id)).toBe(false);
  });

  it("loadComments mirrors the same enrichment", async () => {
    const { loadComments } = await import("@/lib/queries");
    const rows = await loadComments(postId, bruno.id);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0].ownerName).toBe("Priya");
    expect(typeof rows[0].likeCount).toBe("number");
  });
});

describe("profile: avatar + banner persistence", () => {
  it("uploads avatar and banner, then removes the banner", async () => {
    const { updatePetAction } = await import("@/actions/pets");
    setCtx(rahul, [bruno], bruno);

    const fd = new FormData();
    fd.set("name", "Bruno");
    fd.set("avatar", pngFile("avatar.png"));
    fd.set("cover", pngFile("banner.png"));
    const res = await updatePetAction(bruno.id, fd);
    expect(res.ok).toBe(true);

    const db = testDb as typeof import("@/db").db;
    const [afterUpload] = await db.select().from(pets).where(eq(pets.id, bruno.id));
    expect(afterUpload.avatarFileId).toBeTruthy();
    expect(afterUpload.coverFileId).toBeTruthy();

    const fd2 = new FormData();
    fd2.set("removeCover", "true");
    const res2 = await updatePetAction(bruno.id, fd2);
    expect(res2.ok).toBe(true);
    const [afterRemove] = await db.select().from(pets).where(eq(pets.id, bruno.id));
    expect(afterRemove.coverFileId).toBeNull();
    // Avatar untouched by banner removal.
    expect(afterRemove.avatarFileId).toBe(afterUpload.avatarFileId);
  });

  it("rejects edits from non-owners", async () => {
    const { updatePetAction } = await import("@/actions/pets");
    setCtx(priya, [mittens], mittens);
    const fd = new FormData();
    fd.set("name", "Hacked");
    const res = await updatePetAction(bruno.id, fd);
    expect(res.ok).toBe(false);
  });
});

describe("posts: media + mentions", () => {
  it("publishes a post with an image and notifies mentions", async () => {
    const { createPostAction } = await import("@/actions/content");
    const { notifications } = await import("@/db/schema");
    setCtx(priya, [mittens], mittens);

    const fd = new FormData();
    fd.set("kind", "post");
    fd.set("caption", "Playdate with @bruno soon!");
    fd.set("location", "Lisbon");
    fd.set("visibility", "public");
    fd.append("media", pngFile("play.png"));
    const res = await createPostAction(fd);
    expect(res.ok).toBe(true);

    const db = testDb as typeof import("@/db").db;
    const [post] = await db.select().from(posts).where(eq(posts.id, res.postId!));
    expect(post.mediaFileIds).toHaveLength(1);
    expect(post.caption).toContain("@bruno");

    const notifs = await db.select().from(notifications).where(eq(notifications.userId, rahul.id));
    expect(notifs.some((n) => n.type === "mention")).toBe(true);
  });

  it("requires media or text", async () => {
    const { createPostAction } = await import("@/actions/content");
    setCtx(priya, [mittens], mittens);
    const fd = new FormData();
    fd.set("kind", "post");
    fd.set("caption", "");
    const res = await createPostAction(fd);
    expect(res.ok).toBe(false);
  });

  it("comment rows stay queryable after pet switching (no-op sanity)", async () => {
    const db = testDb as typeof import("@/db").db;
    const all = await db.select().from(comments);
    expect(all.length).toBeGreaterThan(0);
  });
});
