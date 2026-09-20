-- Comment likes (also applied automatically by `drizzle-kit push`).
CREATE TABLE IF NOT EXISTS "comment_likes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "pet_id" uuid NOT NULL REFERENCES "pets"("id") ON DELETE CASCADE,
  "comment_id" uuid NOT NULL REFERENCES "comments"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "comment_likes_pair_idx" ON "comment_likes" ("pet_id", "comment_id");
