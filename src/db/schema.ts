import {
  pgTable,
  uuid,
  text,
  boolean,
  timestamp,
  integer,
  date,
  real,
  customType,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; notNull: true; default: false }>({
  dataType() {
    return "bytea";
  },
});

/* ─── Accounts ─────────────────────────────────────────────── */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

/* ─── Media files (stored in DB, served via /api/file/[id]) ── */

export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  name: text("name").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── Pets (the social identities) ─────────────────────────── */

export const pets = pgTable(
  "pets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    username: text("username").notNull().unique(),
    avatarFileId: uuid("avatar_file_id").references(() => files.id, { onDelete: "set null" }),
    coverFileId: uuid("cover_file_id").references(() => files.id, { onDelete: "set null" }),
    bio: text("bio").notNull().default(""),
    animalType: text("animal_type").notNull(),
    customAnimal: text("custom_animal"),
    breed: text("breed"),
    breedNote: text("breed_note").default(""), // "mixed" | "unknown" | "custom" | ""
    gender: text("gender").default(""),
    birthday: date("birthday"),
    personality: text("personality").array().notNull().default([]),
    interests: text("interests").array().notNull().default([]),
    favoriteFood: text("favorite_food").default(""),
    favoriteToys: text("favorite_toys").default(""),
    favoriteActivities: text("favorite_activities").default(""),
    city: text("city").notNull().default(""),
    isPrivate: boolean("is_private").notNull().default(false),
    identityIcon: text("identity_icon").notNull().default("paw"),
    starBadge: boolean("star_badge").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("pets_user_idx").on(t.userId), index("pets_city_idx").on(t.city)],
);

/* ─── Content: posts / reels / stories ─────────────────────── */

export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("post"), // post | reel | story
    caption: text("caption").notNull().default(""),
    location: text("location").default(""),
    mediaFileIds: uuid("media_file_ids").array().notNull().default([]),
    textStyle: text("text_style").default(""), // for text stories
    visibility: text("visibility").notNull().default("public"), // public | followers
    expiresAt: timestamp("expires_at", { withTimezone: true }), // stories
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("posts_pet_idx").on(t.petId), index("posts_created_idx").on(t.createdAt)],
);

/* ─── Social graph ─────────────────────────────────────────── */

export const follows = pgTable(
  "follows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    followerId: uuid("follower_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    followingId: uuid("following_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // active | requested
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("follows_pair_idx").on(t.followerId, t.followingId)],
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    blockerId: uuid("blocker_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("blocks_pair_idx").on(t.blockerId, t.blockedId)],
);

/* ─── Engagement ───────────────────────────────────────────── */

export const likes = pgTable(
  "likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("likes_pair_idx").on(t.petId, t.postId)],
);

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id"),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("comments_post_idx").on(t.postId)],
);

export const commentLikes = pgTable(
  "comment_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    commentId: uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("comment_likes_pair_idx").on(t.petId, t.commentId)],
);

export const saves = pgTable(
  "saves",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("saves_pair_idx").on(t.petId, t.postId)],
);

export const reposts = pgTable(
  "reposts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("reposts_pair_idx").on(t.petId, t.postId)],
);

/* ─── Messaging ────────────────────────────────────────────── */

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  isGroup: boolean("is_group").notNull().default(false),
  title: text("title").default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("active"), // active | pending (message request)
    lastReadAt: timestamp("last_read_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("conv_member_idx").on(t.conversationId, t.petId)],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderPetId: uuid("sender_pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull().default("text"), // text | image | video | post
    text: text("text").notNull().default(""),
    fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
    postShareId: uuid("post_share_id").references(() => posts.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("messages_conv_idx").on(t.conversationId, t.createdAt)],
);

/* ─── Notifications ────────────────────────────────────────── */

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    recipientPetId: uuid("recipient_pet_id").references(() => pets.id, { onDelete: "cascade" }),
    actorPetId: uuid("actor_pet_id").references(() => pets.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // follow, follow_request, like, comment, mention, message, event, system...
    entityType: text("entity_type").default(""),
    entityId: text("entity_id").default(""),
    body: text("body").notNull().default(""),
    read: boolean("read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("notif_user_idx").on(t.userId, t.read)],
);

/* ─── Local ecosystem: events ──────────────────────────────── */

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    creatorPetId: uuid("creator_pet_id").references(() => pets.id, { onDelete: "set null" }),
    creatorUserId: uuid("creator_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    category: text("category").notNull().default("meetup"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    city: text("city").notNull(),
    venue: text("venue").notNull().default(""),
    address: text("address").notNull().default(""),
    petTypes: text("pet_types").array().notNull().default([]),
    capacity: integer("capacity"),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("events_city_idx").on(t.city), index("events_start_idx").on(t.startsAt)],
);

export const eventAttendees = pgTable(
  "event_attendees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("going"), // going | interested
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("event_attendee_idx").on(t.eventId, t.petId)],
);

/* ─── Businesses / clinics ─────────────────────────────────── */

export const businesses = pgTable(
  "businesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    category: text("category").notNull(), // clinic | groomer | trainer | shop | boarding | daycare | sitter | walker | pharmacy | other
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    services: text("services").array().notNull().default([]),
    hours: text("hours").notNull().default(""),
    phone: text("phone").default(""),
    email: text("email").default(""),
    website: text("website").default(""),
    address: text("address").notNull().default(""),
    city: text("city").notNull(),
    emergency: boolean("emergency").notNull().default(false),
    verified: boolean("verified").notNull().default(false),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("biz_city_idx").on(t.city)],
);

/* ─── Adoption & rescue ────────────────────────────────────── */

export const adoptions = pgTable(
  "adoptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    animalType: text("animal_type").notNull(),
    breed: text("breed").default(""),
    ageText: text("age_text").default(""),
    gender: text("gender").default(""),
    city: text("city").notNull(),
    description: text("description").notNull().default(""),
    contact: text("contact").notNull().default(""),
    imageFileId: uuid("image_file_id").references(() => files.id, { onDelete: "set null" }),
    status: text("status").notNull().default("available"), // available | adopted
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("adoptions_city_idx").on(t.city)],
);

/* ─── Health vault (private) ───────────────────────────────── */

export const healthRecords = pgTable(
  "health_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    petId: uuid("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // vaccination | medication | allergy | vet_visit | document | weight | note
    title: text("title").notNull(),
    details: text("details").notNull().default(""),
    recordDate: date("record_date"),
    weightKg: real("weight_kg"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("health_pet_idx").on(t.petId)],
);

/* ─── Reporting ────────────────────────────────────────────── */

export const reports = pgTable("reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  reporterPetId: uuid("reporter_pet_id").references(() => pets.id, { onDelete: "set null" }),
  reporterUserId: uuid("reporter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetType: text("target_type").notNull(),
  targetId: text("target_id").notNull().default(""),
  category: text("category").notNull(),
  details: text("details").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/* ─── AI assistant ─────────────────────────────────────────── */

export const aiConversations = pgTable("ai_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("New conversation"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const aiMessages = pgTable(
  "ai_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id").notNull().references(() => aiConversations.id, { onDelete: "cascade" }),
    role: text("role").notNull(), // user | assistant
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("ai_msg_conv_idx").on(t.conversationId, t.createdAt)],
);
