"use server";

import { db } from "@/db";
import { aiConversations, aiMessages, pets } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getActiveContext, getSessionUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { animalLabel, petAge } from "@/lib/utils";

const DISCLOSER = `You are Pawmind, the pet care assistant inside a pet social platform. You help with general pet health, behavior, training, nutrition, grooming and everyday care.

Rules you must always follow:
- You are NOT a veterinarian and cannot diagnose. Say so naturally when relevant.
- Give helpful, specific, practical general guidance for the pet described.
- If anything sounds potentially serious (breathing trouble, poisoning, trauma, seizures, not eating/drinking for long, bloated abdomen, etc.), say these are concerning signs and advise contacting a veterinarian promptly; for emergencies advise immediate veterinary care.
- Be warm, concise and clear. Use short paragraphs. Avoid medical jargon unless explained.
- Never invent lab results or certainty you don't have. If unsure, say you're unsure.
- Never respond to the human as if they are the pet; the pet's manager is asking on the pet's behalf.`;

export async function aiConfiguredAction(): Promise<{ configured: boolean }> {
  return { configured: Boolean(process.env.AI_API_KEY || process.env.OPENAI_API_KEY) };
}

export async function listAiConversationsAction() {
  const user = await getSessionUser();
  if (!user) return [];
  return db.select().from(aiConversations).where(eq(aiConversations.userId, user.id)).orderBy(desc(aiConversations.createdAt)).limit(30);
}

export async function loadAiConversationAction(conversationId: string) {
  const user = await getSessionUser();
  if (!user) return null;
  const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
  if (!conv || conv.userId !== user.id) return null;
  const msgs = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(asc(aiMessages.createdAt));
  return { conversation: conv, messages: msgs };
}

function buildPetContext(pet: typeof pets.$inferSelect | null): string {
  if (!pet) return "The user has not created a pet profile yet.";
  const lines = [
    `Pet context (the pet this user manages):`,
    `- Name: ${pet.name}`,
    `- Species: ${animalLabel(pet.animalType, pet.customAnimal)}`,
    pet.breed ? `- Breed: ${pet.breed}${pet.breedNote === "mixed" ? " (mixed)" : pet.breedNote === "unknown" ? " (best guess by family)" : ""}` : null,
    petAge(pet.birthday) ? `- Age: ${petAge(pet.birthday)}` : null,
    pet.gender ? `- Gender: ${pet.gender}` : null,
    pet.personality.length ? `- Personality: ${pet.personality.join(", ")}` : null,
    pet.city ? `- City: ${pet.city}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}

export async function sendAiMessageAction(input: {
  conversationId?: string;
  text: string;
  imageDataUrl?: string;
}): Promise<{
  ok: boolean;
  error?: string;
  notConfigured?: boolean;
  conversationId?: string;
  userMessage?: { id: string; role: string; content: string };
  assistantMessage?: { id: string; role: string; content: string };
}> {
  const ctx = await getActiveContext();
  if (!ctx?.user) return { ok: false, error: "Not signed in." };
  const text = input.text.trim();
  const imageDataUrl = (input.imageDataUrl ?? "").slice(0, 40_000_000);
  if (!text && !imageDataUrl) return { ok: false, error: "Type a question first." };
  if (text.length > 3000) return { ok: false, error: "Message too long." };

  const visibleText = text || "Please take a look at this photo of my pet.";

  // ensure conversation exists
  let conversationId = input.conversationId;
  if (!conversationId) {
    const [conv] = await db.insert(aiConversations).values({
      userId: ctx.user.id,
      title: visibleText.slice(0, 60),
    }).returning();
    conversationId = conv.id;
  } else {
    const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
    if (!conv || conv.userId !== ctx.user.id) return { ok: false, error: "Conversation not found." };
  }

  const storedUserContent = imageDataUrl ? `${visibleText}\n[Photo attached for analysis]` : visibleText;
  const [userMsg] = await db.insert(aiMessages).values({
    conversationId, role: "user", content: storedUserContent,
  }).returning();

  const apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { ok: false, notConfigured: true, conversationId, userMessage: { id: userMsg.id, role: "user", content: storedUserContent } };
  }

  const base = (process.env.AI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.AI_MODEL || "gpt-4o-mini";

  // load history for context (last 24 messages)
  const history = await db.select().from(aiMessages).where(eq(aiMessages.conversationId, conversationId)).orderBy(asc(aiMessages.createdAt)).limit(48);

  const messagesPayload: unknown[] = [
    { role: "system", content: `${DISCLOSER}\n\n${buildPetContext(ctx.activePet)}` },
    ...history.slice(-24).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content.replace(/\n\[Photo attached for analysis\]$/, "") })),
  ];
  if (imageDataUrl) {
    // replace last user message with vision payload
    messagesPayload.pop();
    messagesPayload.push({
      role: "user",
      content: [
        { type: "text", text: visibleText + " Describe the animal you see (species, possible breed, visible characteristics, body language) and flag anything visible that might warrant a vet visit — while making clear this is not a diagnosis." },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ],
    });
  }

  let assistantText = "";
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages: messagesPayload, temperature: 0.6 }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { ok: false, error: `The AI service returned an error (${res.status}). ${body.slice(0, 140)}`, conversationId };
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    assistantText = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!assistantText) return { ok: false, error: "The AI returned an empty response.", conversationId };
  } catch (e) {
    return { ok: false, error: "Could not reach the AI service. Check your network and API configuration.", conversationId };
  }

  const [assistantMsg] = await db.insert(aiMessages).values({
    conversationId, role: "assistant", content: assistantText,
  }).returning();

  revalidatePath("/ai");
  return {
    ok: true,
    conversationId,
    userMessage: { id: userMsg.id, role: "user", content: storedUserContent },
    assistantMessage: { id: assistantMsg.id, role: "assistant", content: assistantText },
  };
}

export async function deleteAiConversationAction(conversationId: string) {
  const user = await getSessionUser();
  if (!user) return { ok: false };
  const [conv] = await db.select().from(aiConversations).where(eq(aiConversations.id, conversationId)).limit(1);
  if (!conv || conv.userId !== user.id) return { ok: false };
  await db.delete(aiConversations).where(eq(aiConversations.id, conversationId));
  return { ok: true };
}
