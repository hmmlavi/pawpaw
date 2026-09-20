import "server-only";
import { db } from "@/db";
import { files } from "@/db/schema";

const MAX_IMAGE = 12 * 1024 * 1024; // 12MB
const MAX_VIDEO = 60 * 1024 * 1024; // 60MB

export async function saveUploadedFile(file: File, userId: string): Promise<{ id: string } | { error: string }> {
  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage && !file.type.startsWith("audio/")) {
    return { error: "Unsupported file type." };
  }
  const limit = isVideo ? MAX_VIDEO : MAX_IMAGE;
  if (file.size > limit) {
    return { error: isVideo ? "Videos must be under 60MB." : "Images must be under 12MB." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const [row] = await db
    .insert(files)
    .values({ userId, mime: file.type, name: file.name || "upload", data: buf })
    .returning({ id: files.id });
  return { id: row.id };
}
