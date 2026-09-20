import "server-only";
import { db } from "@/db";
import {
  posts, pets, likes, comments, commentLikes, saves, reposts, follows, blocks,
  events, eventAttendees, businesses, adoptions, notifications, users,
  conversations, conversationMembers, messages, healthRecords,
} from "@/db/schema";
import { and, desc, eq, gt, inArray, ne, or, ilike, sql, asc } from "drizzle-orm";
import { animalIcon, fileUrl } from "@/lib/utils";

export type PetLite = {
  id: string; name: string; username: string; icon: string; avatar: string | null;
  animalType: string; city: string; isPrivate: boolean; starBadge: boolean; birthday: string | null;
};

export type FeedPost = {
  id: string;
  kind: string;
  caption: string;
  location: string | null;
  media: { url: string; id: string }[];
  textStyle: string;
  createdAt: string;
  author: PetLite;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  viewerLiked: boolean;
  viewerSaved: boolean;
  viewerReposted: boolean;
  viewerOwns: boolean;
  viewerFollowState: "none" | "following" | "requested";
  nearbyTag?: boolean;
};

export function toPetLite(p: typeof pets.$inferSelect): PetLite {
  return {
    id: p.id, name: p.name, username: p.username,
    icon: p.identityIcon || animalIcon(p.animalType),
    avatar: fileUrl(p.avatarFileId),
    animalType: p.animalType, city: p.city, isPrivate: p.isPrivate,
    starBadge: p.starBadge, birthday: p.birthday,
  };
}

async function engagement(viewerPetId: string | null, postIds: string[]) {
  if (postIds.length === 0 || !viewerPetId) {
    return { liked: new Set<string>(), saved: new Set<string>(), reposted: new Set<string>() };
  }
  const [l, s, r] = await Promise.all([
    db.select({ postId: likes.postId }).from(likes).where(and(eq(likes.petId, viewerPetId), inArray(likes.postId, postIds))),
    db.select({ postId: saves.postId }).from(saves).where(and(eq(saves.petId, viewerPetId), inArray(saves.postId, postIds))),
    db.select({ postId: reposts.postId }).from(reposts).where(and(eq(reposts.petId, viewerPetId), inArray(reposts.postId, postIds))),
  ]);
  return { liked: new Set(l.map((x) => x.postId)), saved: new Set(s.map((x) => x.postId)), reposted: new Set(r.map((x) => x.postId)) };
}

async function counts(postIds: string[]) {
  if (postIds.length === 0) return new Map<string, { likes: number; comments: number; reposts: number }>();
  const likeRows = await db.select({ postId: likes.postId, n: sql<number>`count(*)::int` }).from(likes).where(inArray(likes.postId, postIds)).groupBy(likes.postId);
  const commentRows = await db.select({ postId: comments.postId, n: sql<number>`count(*)::int` }).from(comments).where(inArray(comments.postId, postIds)).groupBy(comments.postId);
  const repostRows = await db.select({ postId: reposts.postId, n: sql<number>`count(*)::int` }).from(reposts).where(inArray(reposts.postId, postIds)).groupBy(reposts.postId);
  const map = new Map<string, { likes: number; comments: number; reposts: number }>();
  for (const id of postIds) map.set(id, { likes: 0, comments: 0, reposts: 0 });
  likeRows.forEach((r) => map.get(r.postId)!.likes = r.n);
  commentRows.forEach((r) => map.get(r.postId)!.comments = r.n);
  repostRows.forEach((r) => map.get(r.postId)!.reposts = r.n);
  return map;
}

async function followStates(viewerPetId: string | null, authorIds: string[]) {
  const map = new Map<string, "following" | "requested">();
  if (!viewerPetId || authorIds.length === 0) return map;
  const rows = await db.select({ followingId: follows.followingId, status: follows.status }).from(follows)
    .where(and(eq(follows.followerId, viewerPetId), inArray(follows.followingId, authorIds)));
  rows.forEach((r) => map.set(r.followingId, r.status === "active" ? "following" : "requested"));
  return map;
}

export async function serializePosts(rows: { post: typeof posts.$inferSelect; pet: typeof pets.$inferSelect }[], viewerPetId: string | null, nearbyIds = new Set<string>()): Promise<FeedPost[]> {
  const ids = rows.map((r) => r.post.id);
  const authorIds = [...new Set(rows.map((r) => r.pet.id))];
  const [eng, cnt, fStates] = await Promise.all([engagement(viewerPetId, ids), counts(ids), followStates(viewerPetId, authorIds)]);
  return rows.map(({ post, pet }) => {
    const c = cnt.get(post.id) ?? { likes: 0, comments: 0, reposts: 0 };
    return {
      id: post.id,
      kind: post.kind,
      caption: post.caption,
      location: post.location,
      media: post.mediaFileIds.map((id) => ({ id, url: `/api/file/${id}` })),
      textStyle: post.textStyle ?? "",
      createdAt: post.createdAt.toISOString(),
      author: toPetLite(pet),
      likeCount: c.likes,
      commentCount: c.comments,
      repostCount: c.reposts,
      viewerLiked: eng.liked.has(post.id),
      viewerSaved: eng.saved.has(post.id),
      viewerReposted: eng.reposted.has(post.id),
      viewerOwns: viewerPetId === pet.id,
      viewerFollowState: viewerPetId === pet.id ? "following" : (fStates.get(pet.id) ?? "none"),
      nearbyTag: nearbyIds.has(post.id),
    };
  });
}

async function blockedPairs(petId: string): Promise<Set<string>> {
  const rows = await db.select().from(blocks).where(or(eq(blocks.blockerId, petId), eq(blocks.blockedId, petId)));
  const set = new Set<string>();
  rows.forEach((b) => { set.add(b.blockerId); set.add(b.blockedId); });
  set.delete(petId);
  return set;
}

export async function loadFeed(viewerPetId: string): Promise<FeedPost[]> {
  const following = await db.select({ followingId: follows.followingId }).from(follows)
    .where(and(eq(follows.followerId, viewerPetId), eq(follows.status, "active")));
  const followingIds = following.map((f) => f.followingId);
  const blocked = await blockedPairs(viewerPetId);
  const circleIds = [viewerPetId, ...followingIds].filter((id) => !blocked.has(id));

  const circle = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(and(inArray(posts.petId, circleIds.length ? circleIds : [viewerPetId]), eq(posts.kind, "post")))
    .orderBy(desc(posts.createdAt)).limit(60);

  // discovery: pets not already in circle, public, not blocked
  const discovery = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(and(eq(posts.kind, "post"), eq(pets.isPrivate, false), ne(posts.petId, viewerPetId)))
    .orderBy(desc(posts.createdAt)).limit(80);

  const nearby = discovery.filter((d) => !followingIds.includes(d.pet.id) && !blocked.has(d.pet.id));
  const nearbyTagged = nearby.slice(0, 12);
  const nearbyIds = new Set(nearbyTagged.map((d) => d.post.id));

  const merged = [...circle, ...nearbyTagged].sort((a, b) => +new Date(b.post.createdAt) - +new Date(a.post.createdAt));
  return serializePosts(merged.slice(0, 60), viewerPetId, nearbyIds);
}

export type StoryGroup = {
  author: PetLite;
  stories: { id: string; url: string | null; caption: string; textStyle: string; createdAt: string; kind: string }[];
  isOwn: boolean;
};

export async function loadStories(viewerPetId: string): Promise<StoryGroup[]> {
  const following = await db.select({ followingId: follows.followingId }).from(follows)
    .where(and(eq(follows.followerId, viewerPetId), eq(follows.status, "active")));
  const ids = [viewerPetId, ...following.map((f) => f.followingId)];
  const now = new Date();
  const rows = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(and(inArray(posts.petId, ids), eq(posts.kind, "story"), gt(posts.expiresAt!, now)))
    .orderBy(desc(posts.createdAt)).limit(120);
  const groups = new Map<string, StoryGroup>();
  for (const { post, pet } of rows) {
    const g = groups.get(pet.id) ?? { author: toPetLite(pet), stories: [], isOwn: pet.id === viewerPetId };
    g.stories.push({
      id: post.id, url: post.mediaFileIds[0] ? `/api/file/${post.mediaFileIds[0]}` : null,
      caption: post.caption, textStyle: post.textStyle ?? "", createdAt: post.createdAt.toISOString(), kind: post.kind,
    });
    groups.set(pet.id, g);
  }
  return [...groups.values()].sort((a, b) => (a.isOwn ? -1 : b.isOwn ? 1 : 0));
}

export async function loadReels(viewerPetId: string): Promise<FeedPost[]> {
  const blocked = await blockedPairs(viewerPetId);
  const rows = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(eq(posts.kind, "reel")).orderBy(desc(posts.createdAt)).limit(40);
  const filtered = rows.filter((r) => !blocked.has(r.pet.id) && (!r.pet.isPrivate || r.pet.id === viewerPetId));
  const serialized = await serializePosts(filtered, viewerPetId);
  // viewer state on own private or followed posts
  return serialized;
}

export async function loadComments(postId: string, viewerPetId?: string | null) {
  const rows = await db.select({ comment: comments, pet: pets, user: users }).from(comments)
    .innerJoin(pets, eq(pets.id, comments.petId))
    .innerJoin(users, eq(users.id, pets.userId))
    .where(eq(comments.postId, postId)).orderBy(asc(comments.createdAt)).limit(100);
  const ids = rows.map((r) => r.comment.id);
  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  if (ids.length > 0) {
    const countRows = await db.select({ commentId: commentLikes.commentId, n: sql<number>`count(*)::int` })
      .from(commentLikes).where(inArray(commentLikes.commentId, ids)).groupBy(commentLikes.commentId);
    countRows.forEach((r) => likeCounts.set(r.commentId, r.n));
    if (viewerPetId) {
      const mine = await db.select({ commentId: commentLikes.commentId }).from(commentLikes)
        .where(and(eq(commentLikes.petId, viewerPetId), inArray(commentLikes.commentId, ids)));
      mine.forEach((r) => likedByMe.add(r.commentId));
    }
  }
  return rows.map(({ comment, pet, user }) => ({
    id: comment.id, text: comment.text, parentId: comment.parentId, createdAt: comment.createdAt.toISOString(),
    likeCount: likeCounts.get(comment.id) ?? 0,
    viewerLiked: likedByMe.has(comment.id),
    ownerName: user.displayName,
    author: toPetLite(pet),
  }));
}

/* ─── Profile ──────────────────────────────── */

export async function loadProfile(username: string, viewerPetId: string | null) {
  const [pet] = await db.select().from(pets).where(eq(pets.username, username.toLowerCase())).limit(1);
  if (!pet) return null;

  const [postCount] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.petId, pet.id), eq(posts.kind, "post")));
  const [reelCount] = await db.select({ n: sql<number>`count(*)::int` }).from(posts).where(and(eq(posts.petId, pet.id), eq(posts.kind, "reel")));
  const [followerCount] = await db.select({ n: sql<number>`count(*)::int` }).from(follows).where(and(eq(follows.followingId, pet.id), eq(follows.status, "active")));
  const [followingCount] = await db.select({ n: sql<number>`count(*)::int` }).from(follows).where(and(eq(follows.followerId, pet.id), eq(follows.status, "active")));

  let followState: "none" | "following" | "requested" = "none";
  let isBlocked = false;
  if (viewerPetId && viewerPetId !== pet.id) {
    const [f] = await db.select().from(follows).where(and(eq(follows.followerId, viewerPetId), eq(follows.followingId, pet.id))).limit(1);
    followState = f ? (f.status === "active" ? "following" : "requested") : "none";
    const [b] = await db.select().from(blocks).where(and(eq(blocks.blockerId, viewerPetId), eq(blocks.blockedId, pet.id))).limit(1);
    isBlocked = Boolean(b);
  }
  const viewerOwns = viewerPetId === pet.id;
  const canView = viewerOwns || !pet.isPrivate || followState === "following";

  const [pendingRequests, followers, following] = await Promise.all([
    viewerOwns && pet.isPrivate
      ? db.select({ follow: follows, pet: pets }).from(follows).innerJoin(pets, eq(pets.id, follows.followerId))
          .where(and(eq(follows.followingId, pet.id), eq(follows.status, "requested"))).limit(30)
      : Promise.resolve([]),
    db.select({ pet: pets }).from(follows).innerJoin(pets, eq(pets.id, follows.followerId))
      .where(and(eq(follows.followingId, pet.id), eq(follows.status, "active"))).limit(60),
    db.select({ pet: pets }).from(follows).innerJoin(pets, eq(pets.id, follows.followingId))
      .where(and(eq(follows.followerId, pet.id), eq(follows.status, "active"))).limit(60),
  ]);

  let postRows: Awaited<ReturnType<typeof loadFeed>> = [];
  let reelRows: Awaited<ReturnType<typeof loadFeed>> = [];
  let savedRows: Awaited<ReturnType<typeof loadFeed>> = [];
  if (canView) {
    const pr = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
      .where(and(eq(posts.petId, pet.id), eq(posts.kind, "post"))).orderBy(desc(posts.createdAt)).limit(60);
    postRows = await serializePosts(pr, viewerPetId);
    const rr = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
      .where(and(eq(posts.petId, pet.id), eq(posts.kind, "reel"))).orderBy(desc(posts.createdAt)).limit(30);
    reelRows = await serializePosts(rr, viewerPetId);
    if (viewerOwns && viewerPetId) {
      const sr = await db.select({ post: posts, pet: pets }).from(saves)
        .innerJoin(posts, eq(posts.id, saves.postId)).innerJoin(pets, eq(pets.id, posts.petId))
        .where(eq(saves.petId, viewerPetId)).orderBy(desc(saves.createdAt)).limit(60);
      savedRows = await serializePosts(sr, viewerPetId);
    }
  }

  // tagged: posts mentioning this pet
  const taggedRowsRaw = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(and(ne(posts.kind, "story"), ilike(posts.caption, `%@${pet.username}%`), eq(pets.isPrivate, false)))
    .orderBy(desc(posts.createdAt)).limit(30);
  const taggedRows = canView ? await serializePosts(taggedRowsRaw, viewerPetId) : [];

  return {
    pet: toPetLite(pet),
    bio: pet.bio,
    breed: pet.breed,
    breedNote: pet.breedNote,
    customAnimal: pet.customAnimal,
    gender: pet.gender,
    personality: pet.personality,
    interests: pet.interests,
    favoriteFood: pet.favoriteFood,
    favoriteToys: pet.favoriteToys,
    favoriteActivities: pet.favoriteActivities,
    cover: fileUrl(pet.coverFileId),
    counts: { posts: postCount?.n ?? 0, reels: reelCount?.n ?? 0, followers: followerCount?.n ?? 0, following: followingCount?.n ?? 0 },
    followState, isBlocked, viewerOwns, canView,
    posts: postRows, reels: reelRows, saved: savedRows, tagged: taggedRows,
    followers: followers.map((f) => toPetLite(f.pet)),
    following: following.map((f) => toPetLite(f.pet)),
    requests: pendingRequests.map((r) => ({ followId: r.follow.id, pet: toPetLite(r.pet) })),
  };
}

/* ─── Explore / discovery ──────────────────── */

export async function loadExplore(viewerPetId: string, city: string) {
  const following = await db.select({ followingId: follows.followingId }).from(follows)
    .where(and(eq(follows.followerId, viewerPetId), eq(follows.status, "active")));
  const followingIds = new Set(following.map((f) => f.followingId));

  const suggestPets = await db.select().from(pets)
    .where(and(ne(pets.id, viewerPetId), eq(pets.isPrivate, false)))
    .orderBy(desc(pets.createdAt)).limit(30);
  const suggested = suggestPets.filter((p) => !followingIds.has(p.id)).slice(0, 10).map(toPetLite);

  const forYou = await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId))
    .where(and(eq(posts.kind, "post"), eq(pets.isPrivate, false), ne(posts.petId, viewerPetId)))
    .orderBy(desc(posts.createdAt)).limit(24);
  const forYouPosts = await serializePosts(forYou, viewerPetId);

  const now = new Date();
  const localEvents = city
    ? await db.select().from(events).where(and(gt(events.startsAt, now), ilike(events.city, city))).orderBy(asc(events.startsAt)).limit(6)
    : [];
  const localAdoptions = city
    ? await db.select().from(adoptions).where(and(eq(adoptions.status, "available"), ilike(adoptions.city, city))).orderBy(desc(adoptions.createdAt)).limit(6)
    : [];
  const localBusinesses = city
    ? await db.select().from(businesses).where(ilike(businesses.city, city)).orderBy(desc(businesses.verified), desc(businesses.createdAt)).limit(6)
    : [];

  return { suggested, forYou: forYouPosts, localEvents, localAdoptions, localBusinesses };
}

/* ─── Notifications ────────────────────────── */

export async function loadNotifications(userId: string) {
  const rows = await db.select({ notif: notifications, actor: pets }).from(notifications)
    .leftJoin(pets, eq(pets.id, notifications.actorPetId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt)).limit(60);
  return rows.map(({ notif, actor }) => ({
    id: notif.id, type: notif.type, body: notif.body, read: notif.read,
    entityType: notif.entityType, entityId: notif.entityId,
    createdAt: notif.createdAt.toISOString(),
    actor: actor ? toPetLite(actor) : null,
  }));
}

/* ─── Messaging ────────────────────────────── */

export async function loadConversations(petId: string) {
  const memberships = await db.select().from(conversationMembers).where(eq(conversationMembers.petId, petId));
  if (memberships.length === 0) return { inbox: [] as ConvSummary[], requests: [] as ConvSummary[] };
  const convIds = memberships.map((m) => m.conversationId);
  const convs = await db.select().from(conversations).where(inArray(conversations.id, convIds));
  const allMembers = await db.select({ member: conversationMembers, pet: pets }).from(conversationMembers)
    .innerJoin(pets, eq(pets.id, conversationMembers.petId)).where(inArray(conversationMembers.conversationId, convIds));
  const lastMessages = await db.select().from(messages).where(inArray(messages.conversationId, convIds)).orderBy(desc(messages.createdAt)).limit(200);

  type ConvSummary = {
    id: string; isGroup: boolean; title: string; peers: PetLite[];
    lastText: string; lastAt: string; unread: boolean; pending: boolean;
  };

  const summaries: ConvSummary[] = convs.map((c) => {
    const my = memberships.find((m) => m.conversationId === c.id)!;
    const members = allMembers.filter((m) => m.member.conversationId === c.id);
    const peers = members.filter((m) => m.pet.id !== petId).map((m) => toPetLite(m.pet));
    const last = lastMessages.find((m) => m.conversationId === c.id);
    return {
      id: c.id, isGroup: c.isGroup, title: c.title ?? "", peers,
      lastText: last ? (last.text || (last.kind === "image" ? "Photo" : last.kind === "video" ? "Video" : "Shared a post")) : "Say hello",
      lastAt: (last?.createdAt ?? c.createdAt).toISOString(),
      unread: last ? last.createdAt > my.lastReadAt && last.senderPetId !== petId : false,
      pending: my.status === "pending",
    };
  }).sort((a, b) => +new Date(b.lastAt) - +new Date(a.lastAt));

  return { inbox: summaries.filter((s) => !s.pending), requests: summaries.filter((s) => s.pending) };
}

type ConvSummary = {
  id: string; isGroup: boolean; title: string; peers: PetLite[];
  lastText: string; lastAt: string; unread: boolean; pending: boolean;
};

export async function loadConversationDetail(conversationId: string, petId: string) {
  const [member] = await db.select().from(conversationMembers)
    .where(and(eq(conversationMembers.conversationId, conversationId), eq(conversationMembers.petId, petId))).limit(1);
  if (!member) return null;
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, conversationId)).limit(1);
  const members = await db.select({ member: conversationMembers, pet: pets }).from(conversationMembers)
    .innerJoin(pets, eq(pets.id, conversationMembers.petId)).where(eq(conversationMembers.conversationId, conversationId));
  const msgs = await db.select({ msg: messages, sender: pets }).from(messages)
    .innerJoin(pets, eq(pets.id, messages.senderPetId))
    .where(eq(messages.conversationId, conversationId)).orderBy(asc(messages.createdAt)).limit(200);

  // resolve shared posts
  const sharedIds = msgs.filter((m) => m.msg.postShareId).map((m) => m.msg.postShareId!) as string[];
  const shared = sharedIds.length
    ? await db.select({ post: posts, pet: pets }).from(posts).innerJoin(pets, eq(pets.id, posts.petId)).where(inArray(posts.id, sharedIds))
    : [];
  const sharedMap = new Map(shared.map((s) => [s.post.id, {
    id: s.post.id, kind: s.post.kind, caption: s.post.caption,
    media: s.post.mediaFileIds.map((id) => `/api/file/${id}`),
    authorUsername: s.pet.username, authorName: s.pet.name,
  }]));

  return {
    id: conversationId,
    isGroup: conv?.isGroup ?? false,
    title: conv?.title ?? "",
    peers: members.filter((m) => m.pet.id !== petId).map((m) => toPetLite(m.pet)),
    pending: member.status === "pending",
    messages: msgs.map(({ msg, sender }) => ({
      id: msg.id, kind: msg.kind, text: msg.text,
      fileUrl: msg.fileId ? `/api/file/${msg.fileId}` : null,
      createdAt: msg.createdAt.toISOString(),
      mine: sender.id === petId,
      sender: toPetLite(sender),
      shared: msg.postShareId ? sharedMap.get(msg.postShareId) ?? null : null,
    })),
  };
}

/* ─── Health vault ─────────────────────────── */

export async function loadHealth(petId: string) {
  const rows = await db.select().from(healthRecords).where(eq(healthRecords.petId, petId)).orderBy(desc(healthRecords.recordDate), desc(healthRecords.createdAt));
  return rows.map((r) => ({ ...r, createdAtIso: r.createdAt.toISOString() }));
}
