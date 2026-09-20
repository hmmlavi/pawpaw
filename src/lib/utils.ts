import clsx, { type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function fileUrl(id: string | null | undefined): string | null {
  return id ? `/api/file/${id}` : null;
}

export function timeAgo(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d`;
  if (s < 86400 * 30) return `${Math.floor(s / (86400 * 7))}w`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

export function formatCount(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

export function formatEventDate(d: Date | string): string {
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export function formatEventTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function petAge(birthday: string | null | undefined): string | null {
  if (!birthday) return null;
  const b = new Date(birthday);
  const now = new Date();
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth());
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) return null;
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}m` : `${years} yr${years > 1 ? "s" : ""}`;
}

export function isBirthdayToday(birthday: string | null | undefined): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  const now = new Date();
  return b.getUTCMonth() === now.getMonth() && b.getUTCDate() === now.getDate();
}

export function isBirthdaySoon(birthday: string | null | undefined, withinDays = 7): boolean {
  if (!birthday) return false;
  const b = new Date(birthday);
  const now = new Date();
  const next = new Date(now.getFullYear(), b.getUTCMonth(), b.getUTCDate());
  if (next.getTime() < now.getTime() - 86400000 * 2) next.setFullYear(now.getFullYear() + 1);
  const diff = (next.getTime() - now.getTime()) / 86400000;
  return diff >= 0 && diff <= withinDays;
}

export function extractHashtags(text: string): string[] {
  const m = text.match(/#[\p{L}\p{N}_]+/gu);
  return m ? [...new Set(m.map((t) => t.slice(1).toLowerCase()))] : [];
}

export function extractMentions(text: string): string[] {
  const m = text.match(/@[a-zA-Z0-9_.]+/g);
  return m ? [...new Set(m.map((t) => t.slice(1).toLowerCase()))] : [];
}

export function mapsUrl(address: string, city?: string): string {
  const q = encodeURIComponent([address, city].filter(Boolean).join(", "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export const ANIMAL_TYPES = [
  { value: "dog", label: "Dog", icon: "dog" },
  { value: "cat", label: "Cat", icon: "cat" },
  { value: "bird", label: "Bird", icon: "bird" },
  { value: "rabbit", label: "Rabbit", icon: "rabbit" },
  { value: "hamster", label: "Hamster", icon: "hamster" },
  { value: "guinea-pig", label: "Guinea pig", icon: "rat" },
  { value: "fish", label: "Fish", icon: "fish" },
  { value: "turtle", label: "Turtle", icon: "turtle" },
  { value: "reptile", label: "Reptile", icon: "bug" },
  { value: "other", label: "Other", icon: "paw" },
] as const;

export function animalIcon(animalType: string): string {
  return ANIMAL_TYPES.find((a) => a.value === animalType)?.icon ?? "paw";
}

export function animalLabel(animalType: string, custom?: string | null): string {
  if (animalType === "other" && custom) return custom;
  return ANIMAL_TYPES.find((a) => a.value === animalType)?.label ?? "Pet";
}

export const BUSINESS_CATEGORIES = [
  { value: "clinic", label: "Veterinary clinic" },
  { value: "groomer", label: "Groomer" },
  { value: "trainer", label: "Trainer" },
  { value: "shop", label: "Pet shop" },
  { value: "boarding", label: "Boarding" },
  { value: "daycare", label: "Daycare" },
  { value: "sitter", label: "Pet sitter" },
  { value: "walker", label: "Pet walker" },
  { value: "pharmacy", label: "Pet pharmacy" },
  { value: "other", label: "Other" },
] as const;

export function businessCategoryLabel(v: string) {
  return BUSINESS_CATEGORIES.find((c) => c.value === v)?.label ?? "Pet business";
}

export const EVENT_CATEGORIES = [
  { value: "meetup", label: "Pet meetup" },
  { value: "walk", label: "Group walk" },
  { value: "park", label: "Park meetup" },
  { value: "birthday", label: "Birthday" },
  { value: "party", label: "Pet party" },
  { value: "adoption", label: "Adoption event" },
  { value: "rescue", label: "Rescue event" },
  { value: "community", label: "Community" },
] as const;

export function eventCategoryLabel(v: string) {
  return EVENT_CATEGORIES.find((c) => c.value === v)?.label ?? "Event";
}

export const HEALTH_KINDS = [
  { value: "vaccination", label: "Vaccination" },
  { value: "medication", label: "Medication" },
  { value: "allergy", label: "Allergy" },
  { value: "vet_visit", label: "Vet visit" },
  { value: "document", label: "Document" },
  { value: "weight", label: "Weight" },
  { value: "note", label: "Health note" },
] as const;

export function healthKindLabel(v: string) {
  return HEALTH_KINDS.find((k) => k.value === v)?.label ?? "Record";
}
