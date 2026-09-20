import { db } from "@/db";
import { files } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest } from "next/server";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }
  const [file] = await db.select().from(files).where(eq(files.id, id)).limit(1);
  if (!file) return new Response("Not found", { status: 404 });
  const body = new Uint8Array(file.data);
  return new Response(body, {
    headers: {
      "content-type": file.mime,
      "cache-control": "public, max-age=31536000, immutable",
      "content-length": String(body.byteLength),
    },
  });
}
